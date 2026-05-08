class HanabiStartMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HanabiStartMenuScene' });
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Title
    this.titleText = this.add.text(centerX, centerY - 60, 'KataKata Hanabi', {
      fontSize: '36px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Start prompt
    this.startText = this.add.text(centerX, centerY + 10,
      'Press ENTER to start',
      {
          fontSize: '18px',
          color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Blink animation
    this.tweens.add({
      targets: this.startText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.input.keyboard.once('keydown-ENTER', () => {
        this.scene.transition({
        target: 'HanabiGameScene',
        delay: 800,
        duration: 500,
        moveBelow: true
      });
    });
  }
}