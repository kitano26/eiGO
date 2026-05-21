export default class StartMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartMenuScene' });
    }

    preload() {
        this.load.image('spark', 'kata-kata-hanabi/assets/particles/fireworkSpark.png');
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        const cx = W / 2;
        const cy = H / 2;

        // ── Background ────────────────────────────────────────────────
        // Deep navy base
        this.add.rectangle(cx, cy, W, H, 0x020814);

        // Subtle starfield
        const starGfx = this.add.graphics();
        for (let i = 0; i < 120; i++) {
            const sx = Phaser.Math.Between(0, W);
            const sy = Phaser.Math.Between(0, H);
            const r  = Phaser.Math.FloatBetween(0.5, 1.8);
            const a  = Phaser.Math.FloatBetween(0.2, 0.8);
            starGfx.fillStyle(0xffffff, a);
            starGfx.fillCircle(sx, sy, r);
        }

        // Faint radial glow in centre
        const glowGfx = this.add.graphics();
        for (let i = 6; i >= 1; i--) {
            glowGfx.fillStyle(0x0a1a5c, 0.08 * i);
            glowGfx.fillCircle(cx, cy, 60 * i);
        }

        // ── Large 花火 kanji watermark ─────────────────────────────────
        this.add.text(cx, cy + 30, '花火', {
            fontFamily: 'serif',
            fontSize: '260px',
            color: '#FFD700',
        }).setOrigin(0.5).setAlpha(0.045);

        // ── Decorative top & bottom horizontal dividers ────────────────
        const drawDivider = (y) => {
            const g = this.add.graphics();
            g.lineStyle(1, 0xFFD700, 0.35);
            g.beginPath();
            g.moveTo(cx - 220, y);
            g.lineTo(cx + 220, y);
            g.strokePath();
            // Ornament dots
            g.fillStyle(0xFFD700, 0.6);
            g.fillCircle(cx - 220, y, 2.5);
            g.fillCircle(cx + 220, y, 2.5);
            g.fillCircle(cx, y, 3);
        };
        drawDivider(cy - 128);
        drawDivider(cy + 158);

        // ── Title ─────────────────────────────────────────────────────
        // JP label
        const jpLabel = this.add.text(cx, cy - 148, '✦  タイピングゲーム  ✦', {
            fontFamily: 'serif',
            fontSize: '16px',
            color: '#FFD700',
        }).setOrigin(0.5).setAlpha(0);
 
        // "kata kata" — between top divider and kanji
        const kataText = this.add.text(cx, cy - 104, 'k a t a  k a t a', {
            fontFamily: 'Comic Sans MS',
            fontSize: '20px',
            color: '#aaccff',
            stroke: '#001133',
            strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0);
        kataText.setShadow(0, 0, '#4488ff', 8, true, true);
 
        // Main title — 花火 kanji, big gold
        const titleText = this.add.text(cx, cy - 30, '花火', {
            fontFamily: 'Comic Sans MS',
            fontSize: '96px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#FF8C00',
            strokeThickness: 4,
        }).setOrigin(0.5).setAlpha(0);
        titleText.setShadow(0, 0, '#FF6600', 28, true, true);
 
        // English subtitle below kanji
        const subtitleText = this.add.text(cx, cy + 48, 'HANABI', {
            fontFamily: 'Comic Sans MS',
            fontSize: '26px',
            color: '#aaccff',
            letterSpacing: 12,
            stroke: '#001133',
            strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0);
        subtitleText.setShadow(0, 0, '#4488ff', 8, true, true);
 
        // ── Start button ───────────────────────────────────────────────
        const btnW = 220;
        const btnH = 58;
        const btnY = cy + 110;
 
        const btnBg = this.add.graphics().setAlpha(0);
        const drawBtn = (hovered) => {
            btnBg.clear();
            btnBg.fillStyle(hovered ? 0x2255cc : 0x0d1a4a, 1);
            btnBg.lineStyle(2, 0xFFD700, hovered ? 1.0 : 0.75);
            btnBg.fillRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
            btnBg.strokeRoundedRect(cx - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
        };
        drawBtn(false);
 
        const btnText = this.add.text(cx, btnY, '▶  Start Game', {
            fontFamily: 'Comic Sans MS',
            fontSize: '26px',
            color: '#FFD700',
            stroke: '#001133',
            strokeThickness: 1,
        }).setOrigin(0.5).setAlpha(0);
        btnText.setShadow(0, 0, '#4488ff', 6, true, true);
 
        const btnZone = this.add.zone(cx, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
        btnZone.on('pointerover', () => {
            drawBtn(true);
            btnText.setColor('#ffffff');
        });
        btnZone.on('pointerout', () => {
            drawBtn(false);
            btnText.setColor('#FFD700');
        });
        btnZone.on('pointerdown', () => {
            this.startGame();
        });
 
        // ── How-to hint ────────────────────────────────────────────────
        const hintText = this.add.text(cx, cy + 184, 'Type the word shown — fireworks fly when you finish!', {
            fontFamily: 'Comic Sans MS',
            fontSize: '15px',
            color: '#8899bb',
        }).setOrigin(0.5).setAlpha(0);
 
        // ── Staggered entrance animation ───────────────────────────────
        const fadeIn = (targets, delay, duration = 380) => {
            this.tweens.add({ targets, alpha: 1, delay, duration, ease: 'Sine.Out' });
        };
 
        fadeIn(kataText,     200);
        fadeIn(jpLabel,      340);
        fadeIn(titleText,    480);
        fadeIn(subtitleText, 620);
        fadeIn([btnBg, btnText], 840);
        fadeIn(hintText,     960);
 
        // Pulsing glow on title
        this.time.delayedCall(800, () => {
            this.tweens.add({
                targets: titleText,
                alpha: { from: 1, to: 0.72 },
                duration: 1400,
                ease: 'Sine.InOut',
                yoyo: true,
                repeat: -1,
            });
        });
 
        // Pulse the start button text
        this.time.delayedCall(1100, () => {
            this.tweens.add({
                targets: btnText,
                alpha: { from: 1, to: 0.4 },
                duration: 900,
                ease: 'Sine.InOut',
                yoyo: true,
                repeat: -1,
                delay: 400,
            });
        });
 
        // ── Ambient ambient firework bursts ────────────────────────────
        this._burstTimer = this.time.addEvent({
            delay: 1800,
            startAt: 600,
            callback: this.ambientBurst,
            callbackScope: this,
            loop: true,
        });
    }
 
    // ── Ambient firework burst ─────────────────────────────────────────
    ambientBurst() {
        const W = this.scale.width;
        const H = this.scale.height;
        const x = Phaser.Math.Between(60, W - 60);
        const y = Phaser.Math.Between(40, H * 0.45);
 
        const allPalettes = [
            [0x00BFFF, 0x1E90FF, 0xFFFFFF, 0x87CEEB],
            [0x00FF7F, 0x7CFC00, 0xFFFFFF, 0xADFF2F],
            [0xFFD700, 0xFF8C00, 0xFFFFFF, 0xFFEC8B],
            [0xFF1493, 0xFF69B4, 0xFFFFFF, 0xFFB6C1],
            [0x9400D3, 0xDA70D6, 0xFFFFFF, 0xEE82EE],
            [0x00FFFF, 0x00CED1, 0x7FFFD4, 0xE0FFFF],
        ];
 
        const palette = Phaser.Math.RND.pick(allPalettes);
 
        const emitter = this.add.particles(x, y, 'spark', {
            speed: { min: 180, max: 380 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.45, end: 0 },
            lifespan: { min: 300, max: 580 },
            blendMode: 'ADD',
            tint: palette,
        });
 
        emitter.explode(Phaser.Math.Between(28, 45));
        this.time.delayedCall(620, () => emitter.destroy());
    }
 
    startGame() {
        // Fade to black then launch game
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this._burstTimer) this._burstTimer.remove(false);
            this.scene.start('PlayScene');
        });
    }
}