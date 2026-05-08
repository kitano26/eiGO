/**
 * Phaser game configuration for KataKata Hanabi
 */
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

    scene: [HanabiStartMenuScene, HanabiGameScene]
}

const game = new Phaser.Game(config)
