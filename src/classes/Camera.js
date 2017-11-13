import * as THREE from 'three'

export default class Camera extends THREE.PerspectiveCamera {
    constructor(world) {
        super(45, world.window.innerWidth/world.window.innerHeight, 0.1, 50)
        this.world = world
        // Mouse
        this.radius = 10
        this.alpha = -Math.PI/2
        this.beta = Math.PI/2
        this.offsetY = 12

        this.attachControl()
        world.onLoaded(() => {
            // Setting the camera AFTER meshes have loaded prevents glitchiness
            world.setCamera(this)
        })
    }

    attachControl(container = this.world.renderer.domElement) {
        const wnd = this.world.window
        const doc = wnd.document
        wnd.addEventListener('resize', () => {
            this.aspect = wnd.innerWidth/wnd.innerHeight
            this.updateProjectionMatrix()
        })

        return // All controls disabled
        container.addEventListener('mousemove', event => {
            const { buttons, movementX, movementY } = event
            if (buttons & (1<<1)) {
                // secondary button (right)
                this.alpha += movementX*0.01
                this.player.bearing = this.alpha+Math.PI/2
                this.beta = Math.min(Math.PI,
                    Math.max(45*Math.PI/180,
                    this.beta+movementY*0.01)) // clamp [45,180]deg
            } else if (buttons & (1<<0)) {
                // primary button (left)
                this.alpha += movementX*0.01
                this.beta = Math.min(Math.PI,
                    Math.max(45*Math.PI/180,
                    this.beta+movementY*0.01)) // clamp [45,180]deg
            }
        })
        container.addEventListener('mousedown', event => {
            if (!doc.pointerLockElement) container.requestPointerLock()
        })
        container.addEventListener('mouseup', event => {
            if (!!doc.pointerLockElement) doc.exitPointerLock()
        })
        container.addEventListener('mousewheel', event => {
            const { deltaY } = event
            this.radius = Math.max(10, this.radius+deltaY*0.02)
        })
        container.addEventListener('contextmenu', event => {
            event.preventDefault()
        })
    }
}
