/**
 * Phaser game configuration for KataKata Hanabi
 */
import StartMenuScene from './scenes/StartMenuScene.js'
import PlayScene from './scenes/PlayScene.js'

const config = {
    type: Phaser.AUTO,
    width: '100%',
	height: `100%`,
	backgroundColor: "#0b1c2d",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },

    scene: [StartMenuScene, PlayScene]
}

const game = new Phaser.Game(config)
