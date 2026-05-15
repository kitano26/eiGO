// target word box dimensions and position FIXED
const WORD_BOX_WIDTH = 600;
const WORD_BOX_HEIGHT = 100;
const WORD_BOX_MARGIN = 20;

// target word font size
const WORD_FONT_SIZE = '45px';

// Score-based tiers: each entry defines a score threshold and the
// min/max word lengths to draw from at that tier.
// Words will be picked from any bucket whose length falls in [minLen, maxLen].
const SCORE_TIERS = [
    { minScore:    0, minLen: 3, maxLen: 3 },
    { minScore:  400, minLen: 3, maxLen: 4 },
    { minScore: 1000, minLen: 3, maxLen: 5 },
    { minScore: 2000, minLen: 4, maxLen: 5 },
    { minScore: 3200, minLen: 4, maxLen: 6 },
    { minScore: 4500, minLen: 4, maxLen: 7 },
    { minScore: 6000, minLen: 5, maxLen: 8 },
    { minScore: 8000, minLen: 3, maxLen: 99 },
];

// points awarded per word length (8+ defaults to 600)
const WORD_SCORES = { 3: 100, 4: 150, 5: 225, 6: 325, 7: 450 };

class HanabiGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HanabiGameScene' });
    }

    /**
     * Load assets into scene
     */
    preload() {
        // Load images
        this.load.image('redLauncher', 'assets/images/redLauncher.png');
        this.load.image('redLauncherFired', 'assets/images/redLauncherFired.png');
        this.load.image('spark', 'assets/particles/fireworkSpark.png');

        // Load word list
        this.load.text('words', 'assets/myPicDict.csv');
    }

    /**
     * Set up the gameplay scene
     */
    create() {
        // Initialize game state
        this.gameState = 'playing'; // can be 'playing' or 'gameOver'

        this.setupNightSkyBackground();

        this.setupLauncher();

        // Word box configuration
        this.wordBoxX = (this.scale.width - WORD_BOX_WIDTH) / 2;  // centered regardless of screen width
        this.wordBoxY = this.scale.height - WORD_BOX_HEIGHT - WORD_BOX_MARGIN; // fixed distance from bottom

        // Draw word box
        this.wordBox = this.add.rectangle(this.wordBoxX, this.wordBoxY, WORD_BOX_WIDTH, WORD_BOX_HEIGHT, 0xffffff);
        this.wordBox.setOrigin(0, 0); // top-left origin
        this.wordBox.setStrokeStyle(3, 0x00000); // border color and thickness

        // Load word list and set current target word
        const rawWordList = this.cache.text.get('words');
        this.allWords = rawWordList.split('\n').slice(1).map(w => w.trim()).filter(w => /^[a-z ]+$/.test(w));

        // Build a map: wordLength -> [words...]  (sorted so shortest come first)
        this.wordBuckets = {};
        this.allWords.forEach(w => {
            const len = w.length;
            if (!this.wordBuckets[len]) this.wordBuckets[len] = [];
            this.wordBuckets[len].push(w);
        });
 
        // Sorted list of available lengths (e.g. [3, 4, 5, 6, ...])
        this.wordLengths = Object.keys(this.wordBuckets).map(Number).sort((a, b) => a - b);

        this.currentTierIndex = 0;
        this.targetWord = this.pickTargetWord();

        // Compute starting X to center the target word in the box
        const probe = this.add.text(0, -200, this.targetWord, {
            fontFamily: 'Comic Sans MS',
            fontSize: WORD_FONT_SIZE,
        });
        const fullWordWidth = probe.width;
        probe.destroy();

        // Recompute start X to center this word in the box
        this.targetWordStartX = this.wordBoxX + (WORD_BOX_WIDTH - fullWordWidth) / 2;

        const textY = this.wordBoxY + WORD_BOX_HEIGHT / 2;

        // Display target word text
        this.remainingText = this.add.text(this.targetWordStartX, textY, this.targetWord, {
            fontFamily: 'Comic Sans MS',
            fontSize: WORD_FONT_SIZE,
            color: '#666666ff'
        }).setOrigin(0, 0.5).setDepth(1); // bring to front

        // Text to show correctly typed letters in green
        this.typedText = '';
        this.typedText = this.add.text(this.targetWordStartX, textY, '', {
            fontFamily: 'Comic Sans MS',
            fontSize: WORD_FONT_SIZE,
            color: 'rgb(0, 219, 69)'
        }).setOrigin(0, 0.5).setDepth(2); // bring to front of target word

        // Store user input
        this.userInput = ''; 

        // Listen for keyboard input
        this.input.keyboard.on('keydown', this.handleKey, this);

        // Accuracy tracking
        this.totalKeystrokes = 0;
        this.correctKeystrokes = 0;

        // Score
        this.score = 0;
        this.scoreText = this.add.text(20, 20, `Score: ${this.score}`, {
            fontSize: '28px',
            color: '#ffffff'
        });

        this.setupTimer();

        // this.setupGameOverScreen();
        // Create game over overlay (hidden until game over)
        this.gameOverContainer = this.add.container(0, 0);
        this.gameOverContainer.setVisible(false);
        this.gameOverContainer.setDepth(10);
 
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
 
        // Full-screen dark vignette backdrop
        const backdrop = this.add.rectangle(
            this.scale.width / 2, this.scale.height / 2,
            this.scale.width, this.scale.height,
            0x000000, 0.72
        );
 
        // Panel background — deep navy with subtle transparency
        const panelW = 520;
        const panelH = 370;
        const panel = this.add.graphics();
        // Outer glow border (gold)
        panel.lineStyle(3, 0xFFD700, 0.9);
        panel.fillStyle(0x05091f, 0.95);
        panel.strokeRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 18);
        panel.fillRoundedRect(centerX - panelW / 2, centerY - panelH / 2, panelW, panelH, 18);
        // Inner accent border (dimmer gold)
        panel.lineStyle(1, 0xFFD700, 0.3);
        panel.strokeRoundedRect(centerX - panelW / 2 + 6, centerY - panelH / 2 + 6, panelW - 12, panelH - 12, 14);
 
        // Decorative top divider line
        const divider = this.add.graphics();
        divider.lineStyle(1, 0xFFD700, 0.4);
        divider.beginPath();
        divider.moveTo(centerX - 160, centerY - panelH / 2 + 80);
        divider.lineTo(centerX + 160, centerY - panelH / 2 + 80);
        divider.strokePath();
 
        // 花火 kanji watermark — large, very faint, behind text
        const kanjiWatermark = this.add.text(centerX, centerY - 10, '花火', {
            fontFamily: 'serif',
            fontSize: '180px',
            color: '#FFD700',
            alpha: 0.04
        }).setOrigin(0.5).setAlpha(0.055);
 
        // "GAME OVER" title — gold with glow shadow
        this.gameOverText = this.add.text(centerX, centerY - panelH / 2 + 48, 'GAME OVER', {
            fontFamily: 'Comic Sans MS',
            fontSize: '52px',
            fontStyle: 'bold',
            color: '#FFD700',
            stroke: '#FF8C00',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.gameOverText.setShadow(0, 0, '#FF6600', 18, true, true);
 
        // Final score label
        this.finalScoreText = this.add.text(centerX, centerY + 10, `Score: ${this.score}`, {
            fontFamily: 'Comic Sans MS',
            fontSize: '38px',
            color: '#ffffff',
            stroke: '#aaaaaa',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.finalScoreText.setShadow(0, 0, '#88ccff', 8, true, true);

        // Accuracy label
        this.accuracyText = this.add.text(centerX, centerY + 62, 'Accuracy: --%', {
            fontFamily: 'Comic Sans MS',
            fontSize: '24px',
            color: '#aaccff',
            stroke: '#001133',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.accuracyText.setShadow(0, 0, '#4488ff', 6, true, true);
 
        // High score badge — green glow, hidden by default
        this.highScoreText = this.add.text(centerX, centerY + 114, '✦  NEW HIGH SCORE  ✦', {
            fontFamily: 'Comic Sans MS',
            fontSize: '24px',
            color: '#72d677',
            stroke: '#003300',
            strokeThickness: 2,
        }).setOrigin(0.5);
        this.highScoreText.setShadow(0, 0, '#00ff44', 12, true, true);
        this.highScoreText.setVisible(false);
 
         // Restart button — rounded rect background + label
        const btnW = 200;
        const btnH = 52;
        const btnX = centerX;
        const btnY = centerY + panelH / 2 - 44;
 
        this.restartBtnBg = this.add.graphics();
        const drawRestartBtn = (hovered) => {
            this.restartBtnBg.clear();
            this.restartBtnBg.fillStyle(hovered ? 0x2255cc : 0x0d1a4a, 1);
            this.restartBtnBg.lineStyle(2, 0xFFD700, hovered ? 1 : 0.7);
            this.restartBtnBg.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
            this.restartBtnBg.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
        };
        drawRestartBtn(false);
 
        this.restartPromptText = this.add.text(btnX, btnY, '↺  Restart', {
            fontFamily: 'Comic Sans MS',
            fontSize: '24px',
            color: '#FFD700',
            stroke: '#001133',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.restartPromptText.setShadow(0, 0, '#4488ff', 6, true, true);
 
        // Hit area zone for pointer events
        this.restartBtnZone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
        this.restartBtnZone.on('pointerover', () => {
            drawRestartBtn(true);
            this.restartPromptText.setColor('#ffffff');
        });
        this.restartBtnZone.on('pointerout', () => {
            drawRestartBtn(false);
            this.restartPromptText.setColor('#FFD700');
        });
        this.restartBtnZone.on('pointerdown', () => {
            this.restartGame();
        });
 
        this.gameOverContainer.add([
            backdrop, panel, divider, kanjiWatermark,
            this.gameOverText, this.finalScoreText,
            this.accuracyText,this.highScoreText, 
            this.restartBtnBg, this.restartPromptText, this.restartBtnZone
        ]);
 

    }

    /**
     * Update scene each frame  
     */
    update(time, delta) {
        // Move launcher across screen
        if (this.launcher.isMoving) {

            const percentPerSecond = 0.2; // 20% of screen width per second
            const xSpeed = this.scale.width * percentPerSecond;

            this.launcher.x += xSpeed * (delta / 1000);

            // Reset if launcher goes off screen
            if (this.launcher.x > this.scale.width) {
                this.launcher.x = this.launcherXInitial;
                this.launcher.y = this.launcherYInitial;
                
                // Reset target word and user input
                this.setTargetWord();
                this.userInput = '';
            }
        }
    }

    /**********************
     *   CUSTOM METHODS   *
     **********************/
        
    /**
 * Draw an animated night sky background:
 *   - Deep navy → midnight gradient via layered rects
 *   - Glowing moon with a soft halo ring
 *   - 120 stars that twinkle at randomised speeds
 *   - Slow-drifting cloud wisps near the horizon
 */
    setupNightSkyBackground() {

        const W = this.scale.width;
        const H = this.scale.height;

        // ── Smooth sky gradient: many thin slices at very low alpha ──────────
        // Base fill (full coverage, darkest colour)
        this.add.rectangle(W / 2, H / 2, W, H, 0x020924).setDepth(-10);

        // Interpolate from top colour (0x020924) to horizon colour (0x18305e)
        // across 60 thin strips — each only ~2px tall, alpha 0.06
        // The overlap of many low-alpha rects looks like a true gradient.
        const STRIPS   = 60;
        const topR = 0x02, topG = 0x09, topB = 0x24;
        const botR = 0x18, botG = 0x30, botB = 0x5e;

        for (let i = 0; i < STRIPS; i++) {
            const t     = i / (STRIPS - 1);              // 0 → 1
            const r     = Math.round(topR + (botR - topR) * t);
            const g     = Math.round(topG + (botG - topG) * t);
            const b     = Math.round(topB + (botB - topB) * t);
            const color = (r << 16) | (g << 8) | b;

            const sliceH = H / STRIPS + 4;  // +4 ensures no sub-pixel gaps
            const sliceY = (i / STRIPS) * H;

            this.add
                .rectangle(W / 2, sliceY + sliceH / 2, W, sliceH, color, 1.0)
                .setStrokeStyle()
                .setDepth(-9);
        }

        // ── Moon ──────────────────────────────────────────────────────────────
        const moonX = W * 0.82;
        const moonY = H * 0.18;

        // Outer halo (large, very faint)
        this.add.circle(moonX, moonY, 60, 0xd4eeff, 0.08).setDepth(-8);
        // Mid halo
        this.add.circle(moonX, moonY, 44, 0xd4eeff, 0.13).setDepth(-8);
        // Moon body
        this.add.circle(moonX, moonY, 30, 0xe8f4ff, 1.0).setDepth(-8);
        // Shadow overlay (crescent effect)
        this.add.circle(moonX + 10, moonY - 4, 26, 0x0a1a3a, 1.0).setDepth(-7);

        // ── Stars ──────────────────────────────────────────────────────────────
        const STAR_COUNT = 120;
        this.stars = [];

        for (let i = 0; i < STAR_COUNT; i++) {
            const sx = Phaser.Math.Between(10, W - 10);
            const sy = Phaser.Math.Between(10, H * 0.72); // keep above horizon
            const r  = Phaser.Math.FloatBetween(0.5, 2.2);

            // Larger stars get a soft glow ring
            if (r > 1.6) {
                this.add.circle(sx, sy, r * 2.8, 0xffffff, 0.12).setDepth(-6);
            }

            const star = this.add.circle(sx, sy, r, 0xffffff, 1).setDepth(-6);

            // Twinkle: fade in/out at a random pace
            this.tweens.add({
                targets:  star,
                alpha:    { from: Phaser.Math.FloatBetween(0.15, 0.5),
                            to:   Phaser.Math.FloatBetween(0.85, 1.0) },
                duration: Phaser.Math.Between(800, 3500),
                yoyo:     true,
                repeat:   -1,
                ease:     'Sine.easeInOut',
                delay:    Phaser.Math.Between(0, 2000),
            });

            this.stars.push(star);
        }

        // ── Colour-tinted accent stars (gold / blue-white) ─────────────────
        const accentColors = [0xffd88a, 0xadd8ff, 0xffc0f0];
        for (let i = 0; i < 18; i++) {
            const sx    = Phaser.Math.Between(20, W - 20);
            const sy    = Phaser.Math.Between(10, H * 0.65);
            const color = Phaser.Math.RND.pick(accentColors);
            const accent = this.add.circle(sx, sy, Phaser.Math.FloatBetween(1, 2.5), color, 1)
                .setDepth(-6);
            this.tweens.add({
                targets:  accent,
                alpha:    { from: 0.4, to: 1 },
                duration: Phaser.Math.Between(1200, 4000),
                yoyo:     true,
                repeat:   -1,
                ease:     'Sine.easeInOut',
                delay:    Phaser.Math.Between(0, 3000),
            });
        }

        // ── Cloud wisps near horizon (soft, semi-transparent) ─────────────
        const cloudY = H * 0.74;
        const clouds = [
            { x: W * 0.12, w: 130, h: 22 },
            { x: W * 0.40, w: 180, h: 18 },
            { x: W * 0.70, w: 110, h: 16 },
            { x: W * 0.88, w: 150, h: 20 },
        ];
        clouds.forEach(c => {
            // Each cloud = 3 overlapping ellipses for fluffiness
            [0, -8, 10].forEach((dx, j) => {
                this.add.ellipse(
                    c.x + dx, cloudY - j * 3,
                    c.w * (0.6 + j * 0.25), c.h,
                    0x2a4a8a, 0.18
                ).setDepth(-8);
            });
        });
    }  

    /**
     * Create and position the launcher sprite, and set it to move across the screen
     */
    setupLauncher() {
        this.launcherXInitial = 100;
        this.launcherYInitial = this.scale.height - 150;

        this.launcher = this.add.sprite(this.launcherXInitial, this.launcherYInitial, 'redLauncher');
        this.launcher.isMoving = true;
        this.launcher.setScale(0.2);
        this.launcher.setDepth(-1); // send to back
    }

    /**
     * Create timer
     */
    setupTimer(){
        // Timer: 60-second countdown
        this.timeLeft = 5; // seconds
        this.timerText = this.add.text(this.scale.width - 20,
            20,
            `Time: ${this.timeLeft}`,
            {
                fontSize: '28px',
                color: '#ffd700',
                stroke: '#ffffffff',
                strokeThickness: 2
            }
            ).setOrigin(1, 0);

        this.timerText.setShadow(0, 0, '#ff00f2ff', 15, true, true);  

        this.timerEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onTimerTick,
            callbackScope: this,
            loop: true
        });
    }

    /** 
     * Create Game Over screen with final score and high score notification
    */
    setupGameOverScreen() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Create game over text
        this.gameOverText = this.add.text(centerX, centerY - 20, 'Game Over', {
            fontSize: '48px',
            color: '#03bafc',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.gameOverText.setVisible(false); // hide until game over
        
        // Create high score text (only shown if player beats previous high score)
        this.highScoreText = this.add.text(centerX, centerY + 50, 'NEW HIGH SCORE!', {
            fontSize: '32px',
            color: '#b8336a'
        }).setOrigin(0.5);
        this.highScoreText.setVisible(false); // hide until game over

        // Create final score text 
        this.finalScoreText = this.add.text(centerX, centerY + 90, `Final Score: ${this.score}`, {
            fontSize: '32px',
            color: '#fdfcdc'
        }).setOrigin(0.5);
        this.finalScoreText.setVisible(false); // hide until game over

        // Create restart button
        const btnW = 220;
        const btnH = 55;
        this.restartButton = this.add.rectangle(centerX, centerY + 170, btnW, btnH, 0x03bafc)
            .setStrokeStyle(3, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setVisible(false);
 
        this.restartButtonText = this.add.text(centerX, centerY + 170, '▶  Play Again', {
            fontSize: '26px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setVisible(false);
 
        // Hover effects
        this.restartButton.on('pointerover', () => {
            this.restartButton.setFillStyle(0xF07167);
        });
        this.restartButton.on('pointerout', () => {
            this.restartButton.setFillStyle(0x03BAFC);
        });
        this.restartButton.on('pointerdown', () => {
            this.restartGame();
        });
    }

    /**
     * Pick a new target word based on current length tier
     */ 
    pickTargetWord() {
        const tier = SCORE_TIERS[this.currentTierIndex];

        // Collect all buckets whose length falls within [minLen, maxLen]
        let pool = this.wordLengths
            .filter(len => len >= tier.minLen && len <= tier.maxLen)
            .flatMap(len => this.wordBuckets[len]);
 
        // Fallback: if no words exist in that range, use the closest available bucket
        if (pool.length === 0) {
            const closest = this.wordLengths.reduce((prev, len) =>
                Math.abs(len - tier.minLen) < Math.abs(prev - tier.minLen) ? len : prev
            );
            pool = this.wordBuckets[closest];
        }
 
        return Phaser.Math.RND.pick(pool);
    }
 
    
    /**
     * Update the target word displayed in the box, and reset user input
     */
    setTargetWord() {
        this.targetWord = this.pickTargetWord();
        
        const probe = this.add.text(0, -200, this.targetWord, {
        fontFamily: 'Comic Sans MS',
        fontSize: WORD_FONT_SIZE,
        });
        const fullWordWidth = probe.width;
        probe.destroy();

        // Recompute start X to center this word in the box
        this.targetWordStartX = this.wordBoxX + (WORD_BOX_WIDTH - fullWordWidth) / 2;

        const textY = this.wordBoxY + WORD_BOX_HEIGHT / 2;

        this.typedText.setText('');
        this.typedText.setPosition(this.targetWordStartX, textY);

        this.remainingText.setText(this.targetWord);
        this.remainingText.setPosition(this.targetWordStartX, textY);
    }
    
    /**
     * Handle keyboard input
     */
    handleKey(event) {
        if (event.repeat) {
            return;
        }

        if (this.gameState === "playing") {
            const key = event.key.toLowerCase();    // Normalize to lowercase
        
            // Only process a-z or space keys
            if (/^[a-z ]$/.test(key)) {
                this.totalKeystrokes++;

                // Check if key matches next letter in target word
                if (key === this.targetWord.charAt(this.userInput.length)) {
                    this.userInput += key;                                              // Append key to user input
                    this.typedText.setText(this.userInput);
                    this.remainingText.setText(this.targetWord.slice(this.userInput.length));
                    this.remainingText.setX(this.typedText.x + this.typedText.width); // shift right by typed portion width

                    // Accuracy tracking
                    this.correctKeystrokes++;
                } else {
                    const originalX = this.wordBox.x;

                    // Shake the word box horizontally to indicate error
                    this.tweens.add({
                        targets: this.wordBox,
                        x: originalX + 10,
                        duration: 35,
                        yoyo: true,
                        repeat: 3,
                        onComplete: () => {
                            this.wordBox.x = originalX;
                        }
                    });
                }

                // Check if user input matches target word
                if (this.userInput === this.targetWord) {
                    // Increment score based on word length
                    const points = WORD_SCORES[this.targetWord.length] ?? 600;
                    this.score += points;
                    this.scoreText.setText(`Score: ${this.score}`);

                    // Advance tier index if score has crossed the next threshold
                    const nextTier = SCORE_TIERS[this.currentTierIndex + 1];
                    if (nextTier && this.score >= nextTier.minScore) {
                        this.currentTierIndex++;
                    }

                    // Stop moving launcher temporarily
                    this.launcher.isMoving = false;

                    // Launch firework
                    this.launchFirework();

                    // Select new target word
                    this.setTargetWord();

                    // Clear user input
                    this.userInput = '';
                }
            }
        }

    }

    /**
     * Launch firework from (x, y)
     */
    launchFirework() {
        this.launcher.setTexture('redLauncherFired');
        this.launcher.angle = Phaser.Math.Between(-30, 30); // slight random angle
        
        // Move rocket up using a tween
        this.tweens.add({
            targets: this.launcher,
            y: Phaser.Math.Between(this.launcherYInitial - 400, this.launcherYInitial - 100),  // height of the launch
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                this.launcher.setVisible(false);
                // explode when reached top
                this.explodeFirework(this.launcher.x, this.launcher.y, this.targetWord.length);

                // Reset launcher position after explosion
                this.time.delayedCall(600, () => {
                    this.launcher.setTexture('redLauncher');
                    this.launcher.setVisible(true);
                    this.launcher.angle = 0;
                    this.launcher.x = this.launcherXInitial;
                    this.launcher.y = this.launcherYInitial;
                    this.launcher.isMoving = true;
                });
            }
        });
    }

    /**
     * Create firework explosion at (x, y)
     */
    explodeFirework(x, y, wordLength) {
        // 3 palette variants per word length — one is chosen randomly each time
       const palettes = {  3: [
                [ 0x00BFFF, 0x1E90FF, 0xFFFFFF, 0x87CEEB ], // icy blue + white
                [ 0x00FFFF, 0x00CED1, 0x7FFFD4, 0xE0FFFF ], // cyan/aqua
                [ 0x191970, 0x4169E1, 0x00008B, 0xADD8E6 ], // deep navy + pale
            ],
            4: [
                [ 0x00FF7F, 0x7CFC00, 0xFFFFFF, 0xADFF2F ], // electric lime + white
                [ 0x00FA9A, 0x00FF00, 0x7FFF00, 0x66CDAA ], // mint/spring
                [ 0x006400, 0x228B22, 0x90EE90, 0x00FF00 ], // dark to bright green
            ],
            5: [
                [ 0xFFD700, 0xFF8C00, 0xFFFFFF, 0xFFEC8B ], // gold + white flash
                [ 0xFF0000, 0xFF6347, 0xFF4500, 0xFFDAB9 ], // red/tomato
                [ 0xFFFF00, 0xFFF44F, 0xFFD700, 0xFFFACD ], // bright yellow
            ],
            6: [
                [ 0xFF1493, 0xFF69B4, 0xFFFFFF, 0xFFB6C1 ], // hot pink + white
                [ 0xFF00FF, 0x8B008B, 0xFF69B4, 0xEE00EE ], // magenta/dark
                [ 0xFF007F, 0xDC143C, 0xFF6EB4, 0xFFC0CB ], // rose/crimson
            ],
            7: [
                [ 0x9400D3, 0xDA70D6, 0xFFFFFF, 0xEE82EE ], // purple + white burst
                [ 0x4B0082, 0x8A2BE2, 0x00BFFF, 0xD8BFD8 ], // indigo + blue accent
                [ 0xFF00FF, 0xC71585, 0xFFD700, 0xDDA0DD ], // violet + gold clash
            ],
        };

        const defaultPalettes = [
            [ 0xFF0000, 0xFFD700, 0x00FF00, 0x00BFFF, 0xFF00FF ], // full spectrum
            [ 0xFF4500, 0xFFFFFF, 0x00BFFF, 0xFF1493, 0x7FFF00 ], // vivid clash
            [ 0xFFD700, 0xFF0000, 0x00CED1, 0x9400D3, 0xFF7F00 ], // warm/cool contrast
        ];
 
 
        const colorPalette = palettes[wordLength] ?? defaultPalettes;
        const fireworkColor = Phaser.Math.RND.pick(colorPalette);

        const emitter = this.add.particles(x, y, 'spark', {
            speed: { min: 250, max: 500 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: { min: 300, max: 600 },
            blendMode: 'ADD',
            tint: fireworkColor
        });

        emitter.explode(50);
        this.time.delayedCall(600, () => emitter.destroy());
    }

    /**
     * Timer tick event
     */
    onTimerTick() {
        if (this.gameState === 'gameOver') {
            return;
        }

        this.timeLeft--;

        // Update timer text
        this.timerText.setText(`Time: ${this.timeLeft}`);

        // Check for game over
        if (this.timeLeft <= 0) {
            this.endGame();
        }
    }

    /**
     * End the game and show final score
     */
    // endGame() {
    //     this.gameState = 'gameOver';

    //     this.timerEvent.remove(false); // stop timer
    //     this.launcher.isMoving = false; // stop launcher movement


    //     // Hide game assets
    //     this.launcher.setVisible(false);
    //     this.wordBox.setVisible(false); // Hide word box   
    //     this.typedText.setVisible(false);
    //     this.remainingText.setVisible(false);        
    //     // this.typedText.setText('');
    //     // this.remainingText.setText('');

    //     // Show game over assets
    //     this.gameOverText.setVisible(true);
    //     this.finalScoreText.setText(`Final Score: ${this.score}`);
    //     this.finalScoreText.setVisible(true);
    //     this.restartButton.setVisible(true);
    //     this.restartButtonText.setVisible(true);

    //     // Get saved high score
    //     const savedHighScore = localStorage.getItem('kataHanabiHighScore');

    //     // If no high score yet OR new score is higher
    //     if (!savedHighScore || this.score > parseInt(savedHighScore)) {
    //         localStorage.setItem('kataHanabiHighScore', this.score);
    //         this.highScoreText.setVisible(true);
    //     }
    // }
    endGame() {

        // stop gameplay
        this.gameState = 'gameOver';
        this.timerEvent.remove(false); // stop timer
        this.launcher.isMoving = false; // stop launcher movement
        this.wordBox.setVisible(false); // Hide word box           
        this.typedText.setText('');
        this.remainingText.setText('');
 
        // Update final score text
        this.finalScoreText.setText(`Score: ${this.score}`);

        // Calculate accuracy
        const accuracy = this.totalKeystrokes > 0
            ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
            : 100;
        const accuracyColor = accuracy >= 90 ? '#72d677' : accuracy >= 70 ? '#FFD700' : '#ff6b6b';
        this.accuracyText.setText(`Accuracy: ${accuracy}%`);
 
        // Check high score
        const savedHighScore = localStorage.getItem('kataHanabiHighScore');
        const isHighScore = !savedHighScore || this.score > parseInt(savedHighScore);
        if (isHighScore) {
            localStorage.setItem('kataHanabiHighScore', this.score);
            this.highScoreText.setVisible(true);
        }
 
        // Animate overlay in: fade + scale from center
        this.gameOverContainer.setVisible(true);
        this.gameOverContainer.setAlpha(0);
        this.gameOverContainer.setScale(0.88);
        this.tweens.add({
            targets: this.gameOverContainer,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 420,
            ease: 'Back.Out'
        });
 
        // Staggered text reveals
        this.gameOverText.setAlpha(0);
        this.finalScoreText.setAlpha(0);
        this.accuracyText.setAlpha(0);
        this.restartPromptText.setAlpha(0);
 
        this.time.delayedCall(200, () => {
            this.tweens.add({ targets: this.gameOverText, alpha: 1, duration: 300, ease: 'Sine.Out' });
        });
        this.time.delayedCall(420, () => {
            this.tweens.add({ targets: this.finalScoreText, alpha: 1, duration: 300, ease: 'Sine.Out' });
        });
        this.time.delayedCall(560, () => {
            this.tweens.add({ targets: this.accuracyText, alpha: 1, duration: 300, ease: 'Sine.Out' });
        });

        if (isHighScore) {
            this.highScoreText.setAlpha(0);
            this.time.delayedCall(600, () => {
                this.tweens.add({ targets: this.highScoreText, alpha: 1, duration: 300, ease: 'Sine.Out' });
            });
        }
        this.time.delayedCall(700, () => {
            this.tweens.add({ targets: this.restartPromptText, alpha: 1, duration: 300, ease: 'Sine.Out' });
            // Pulse the restart prompt indefinitely
            this.tweens.add({
                targets: this.restartPromptText,
                alpha: { from: 1, to: 0.35 },
                duration: 850,
                ease: 'Sine.InOut',
                yoyo: true,
                repeat: -1,
                delay: 300
            });
        });
 
        // Fire a celebratory burst of fireworks across the screen
        const burstCount = 5;
        for (let i = 0; i < burstCount; i++) {
            this.time.delayedCall(i * 260 + 150, () => {
                const bx = Phaser.Math.Between(80, this.scale.width - 80);
                const by = Phaser.Math.Between(60, this.scale.height / 2 - 20);
                this.explodeFirework(bx, by, Phaser.Math.Between(3, 7));
            });
        }
    }

    /**
     * Restart the game
     */
    restartGame() {
        this.scene.restart();
    }
}
