import uuid from 'uuid'
import * as THREE from 'three'
import '../lib/THREEPlugins'

export default class World {
    constructor(wnd) {
        this.window = wnd
        this.clock = new THREE.Clock()
        this.isLoading = true
        this.loader = THREE.DefaultLoadingManager
        this.onLoadedCallbacks = []
        this.loader.onLoad = () => {
            this.isLoading = false
            this.onLoadedCallbacks.forEach(cb => cb())
        }
        this.loader.onError = url => console.error(`There was an error loading ${url}`)

        this.setupRenderer()
        this.setupScene()
        this.setupLighting()

        // Auto resize engine
        wnd.addEventListener('resize', () => {
            this.renderer.setSize(wnd.innerWidth, wnd.innerHeight)
        })

        this.onRenderCallbacks = []
        this.animationMixers = []
        this.loadedFbx = {}
    }

    drawGridQuadrant(signX, signZ) {
        const GRID_SIZE = 10
        const GRID_N = 20

        const sX = signX > 0 ? 1 : -1
        const sZ = signZ > 0 ? 1 : -1
        for (let i=0; i<GRID_N; i++) {
            for (let j=0; j<GRID_N; j++) {
                const offX = i*GRID_SIZE*sX
                const offZ = j*GRID_SIZE*sZ
                const geo = new THREE.BufferGeometry()
                const verts = new Float32Array([
                    offX,            0,    offZ,
                    offX,            0,    offZ+GRID_SIZE,
                    offX+GRID_SIZE,  0,    offZ+GRID_SIZE,
                    offX+GRID_SIZE,  0,    offZ,
                    offX,            0,    offZ
                ])
                geo.addAttribute('position', new THREE.BufferAttribute(verts, 3))
                const mat = new THREE.LineBasicMaterial({ color: 0 })
                const line = new THREE.Line(geo, mat)
                this.scene.add(line)
            }
        }
    }

    showGrid() {
        this.drawGridQuadrant(1, 1)
        // this.drawGridQuadrant(1, -1)
        // this.drawGridQuadrant(-1, 1)
        // this.drawGridQuadrant(-1, -1)
    }

    setupRenderer() {
        const renderer = new THREE.WebGLRenderer({ alpha: true })
        renderer.setSize(this.window.innerWidth, this.window.innerHeight)
        this.renderer = renderer
        this.window.document.body.appendChild(renderer.domElement)
    }

    setupScene() {
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0)
        this.scene = scene
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
        this.scene.add(ambientLight)
        this.ambientLight = ambientLight
        const frontLight = new THREE.PointLight(0xffffee, 1.0, 100)
        this.scene.add(frontLight)
        frontLight.position.x = -25
        frontLight.position.y = 50
        frontLight.position.z = 10
        const hairLight = new THREE.PointLight(0xffffff, 0.5, 100)
        this.scene.add(hairLight)
        hairLight.position.x = 25
        hairLight.position.y = 50
        hairLight.position.z = 0

    }

    addAnimationMixer(mixer) {
        this.animationMixers.push(mixer)
    }

    loadFbx(name, filename, addToScene = false, cb = () => {}) {
        const fbxLoader = new THREE.FBXLoader(this.loader)
        fbxLoader.load(filename, object => {
            object.name = name
            if (this.loadedFbx[name]) {
                console.log(`Warning: overwriting existing FBX '${name}'!`)
            }
            this.loadedFbx[name] = object
            if (addToScene) this.scene.add(object)
            cb(null, object)
        }, xhr => {
            // console.log(xhr.loaded/xhr.total*100 + '% loaded')
        }, xhr => {
            const errMsg = `Error loading FBX '${name}': ${JSON.stringify(xhr)}!`
            console.error(errMsg)
            cb(new Error(errMsg), null)
        })
    }

    onLoaded(cb) {
        if (typeof cb !== 'function') {
            throw new Error(`${cb} must be a function!`)
        }

        if (this.isLoading) {
            this.onLoadedCallbacks.push(cb)
        } else {
            // Already loaded, invoke callback immediately
            cb()
        }
    }

    onRender(cb) {
        if (typeof cb !== 'function') {
            throw new Error(`${cb} must be a function!`)
        } else {
            cb._id = uuid.v4()
            this.onRenderCallbacks.push(cb)
        }
    }

    offRender(_id) {
        this.onRenderCallbacks = this.onRenderCallbacks.filter(cb => cb._id !== _id)
    }

    setCamera(camera) {
        this.camera = camera
    }

    render() {
        // Store the delta so it can be passed around (for consistency)
        const clockDelta = this.clock.getDelta()
        // Run animations
        this.animationMixers.forEach(mixer => mixer.update(clockDelta))
        // Run onRender subscriptions
        this.onRenderCallbacks.forEach(cb => cb(clockDelta))
        // Render current frame only if camera available
        if (this.camera) {
            this.renderer.render(this.scene, this.camera)
        } else {
            // console.error('No camera has been setup yet!')
        }
        // Next frame
        requestAnimationFrame(() => this.render())
    }
}
