import './styles/index.scss'
import './index.html'

import * as THREE from 'three'

import World from './classes/World'
import Camera from './classes/Camera'

class Orange {
    constructor(world, xSize = 20, minVel = 10, maxVel = 30, readyForGc = () => {}) {
        this.world = world
        this.readyForGc = readyForGc
        this.destroyed = false
        this.killed = false

        const mWhole = world.loadedFbx['orange']
        const mTop = world.loadedFbx['orangeTop']
        const mBottom = world.loadedFbx['orangeBottom']
        if (!(mWhole && mTop && mBottom)) {
            throw new Error('Orange model has not been loaded!')
        }
        const cg = new THREE.SphereGeometry(2, 12, 12)
        const cm = new THREE.MeshBasicMaterial({ color: 0x00ffff })
        cm.visible = false
        const collider = new THREE.Mesh(cg, cm)
        this.world.scene.add(collider)
        this.collider = collider
        const modelWhole = mWhole.clone()
        const modelTop = mTop.clone()
        const modelBottom = mBottom.clone()
        this.world.scene.add(modelWhole)
        this.modelWhole = modelWhole
        this.modelTop = modelTop
        this.modelBottom = modelBottom

        // physics
        // Randomise starting position
        const xPos = Math.random()*xSize-xSize/2
        this.position = new THREE.Vector3(xPos, 0, 0)
        this.xDrift = 0

        // Randomise velocity
        const xDir = xPos > 0 ? -1 : 1
        const xVel = xDir*Math.random()*2-1 // x jitter
        const yVel = minVel+(Math.random()*(Math.abs(maxVel-minVel)))
        this.velocity = new THREE.Vector3(xVel, yVel, 0)

        this.onRenderSub = world.onRender(clockDelta => this.render(clockDelta))
    }

    kill() {
        if (!this.killed) {
            // TODO: plus points
            this.killed = true
            this.world.scene.remove(this.modelWhole)
            this.world.scene.add(this.modelTop)
            this.world.scene.add(this.modelBottom)
        }
    }

    cleanup() {
        if (!this.destroyed) {
            this.destroyed = true
            this.world.scene.remove(this.modelWhole)
            this.world.scene.remove(this.modelTop)
            this.world.scene.remove(this.modelBottom)
            this.world.offRender(this.onRenderSub)
            this.readyForGc()
        }
    }

    render(clockDelta) {
        const t = clockDelta

        // calc v(t)
        this.velocity.y += -9.81*t

        // calc s(t)
        this.position.x += this.velocity.x*t
        this.position.y += this.velocity.y*t

        // set position
        this.collider.position.x = this.position.x
        this.collider.position.y = this.position.y
        this.modelWhole.position.x = this.position.x
        this.modelWhole.position.y = this.position.y
        this.modelTop.position.x = this.position.x
        this.modelTop.position.y = this.position.y
        this.modelBottom.position.x = this.position.x
        this.modelBottom.position.y = this.position.y

        const rndRot = Math.abs(this.velocity.y*t)
        this.modelWhole.rotateX(rndRot)
        this.modelWhole.rotateZ(rndRot)
        this.modelTop.rotateX(rndRot)
        this.modelTop.rotateZ(rndRot)
        this.modelBottom.rotateX(rndRot)
        this.modelBottom.rotateZ(rndRot)

        if (this.killed) {
            this.xDrift += 5.*this.velocity.x*t
            this.modelTop.position.x -= this.xDrift
            this.modelTop.rotateX(Math.random()*.001)
            this.modelTop.rotateY(Math.random()*.001)
            this.modelTop.rotateZ(Math.random()*.001)
            this.modelBottom.position.x += this.xDrift
            this.modelBottom.rotateX(-rndRot-Math.random()*.001)
            this.modelBottom.rotateY(-rndRot-Math.random()*.001)
            this.modelBottom.rotateZ(-rndRot-Math.random()*.001)
        }

        // Check if out of bounds / below the screen
        if (this.modelWhole.position.y < -20) {
            this.cleanup()
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const world = new World(window)
    const cam = new Camera(world)

    world.loadFbx('orange', '/assets/models/orange/orange_whole.fbx', false)
    world.loadFbx('orangeTop', '/assets/models/orange/orange_top.fbx', false)
    world.loadFbx('orangeBottom', '/assets/models/orange/orange_bottom.fbx', false)

    world.onLoaded(() => {
        const camY = 25
        const camZ = 30
        cam.position.z = camZ
        cam.position.y = camY
        cam.updateMatrix()
        cam.lookAt(new THREE.Vector3(0, camY, 0))

        let oranges = []
        const moreOranges = () => {
            for (let i=0; i<3; i++) {
                let o = new Orange(world, 50, 20, 40, () => {
                    // remove by reference
                    oranges.splice(oranges.indexOf(o), 1)
                    o = null
                })
                oranges.push(o)
            }
        }
        setInterval(moreOranges, 3500)

        // Intersects
        let mousedown = false
        const mouse = new THREE.Vector2()
        window.addEventListener('mousedown', event => {
            mousedown = true
        })
        window.addEventListener('mouseup', event => {
            mousedown = false
        })
        window.addEventListener('mousemove', event => {
            const { innerWidth, innerHeight } = window
            const { offsetX, offsetY } = event
            mouse.x = (offsetX/innerWidth)*2-1
            mouse.y = -(offsetY/innerHeight)*2+1
        })
        world.onRender(() => {
            if (mousedown) {
                const raycaster = new THREE.Raycaster()
                raycaster.setFromCamera(mouse, cam)
                oranges.forEach(o => {
                    const inters = raycaster.intersectObject(o.modelWhole, true)
                    if (inters.length) {
                        o.kill()
                    }
                })
                // const arrow = new THREE.ArrowHelper(raycaster.ray.direction, raycaster.ray.origin, 50, Math.random()*0xffffff)
                // world.scene.add(arrow)
            }
        })
    })

    world.render()
})
