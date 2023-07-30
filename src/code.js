import * as THREE from 'three'
                    import * as CANNON from 'cannon-es'
                    import * as util from './util'
                    import { Button } from './presets/button'
                    import { Slider } from './presets/slider'

                    export function run () {
                      try {
                        const cube = createCube(-2, 1, 0, 'red', 0.3)
scene.add(cube)

                        window.cube = cube
                      } catch (error) {
                        console.log("ERROR: " + error)
                      }
                    }
                    // 1690714024899