/**
 * Web Audio API を活用したプロシージャルサウンドシステム
 * 外部音声ファイルの読み込み不要で、超軽量・低遅延な効果音とBGMを生成
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.bgmPlaying = false;
        this.bgmStep = 0;
        this.bgmInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            this.ctx = new AudioContext();
        }
    }

    resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 斬撃音（鋭い風切り音）
    playSlash() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, t);
        filter.frequency.exponentialRampToValueAtTime(400, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.12);
    }

    // 敵被弾音（鈍いインパクト）
    playHit() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    // 敵撃破音（爆発風の低音バースト）
    playExplosion() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;

        // ノイズバッファ生成
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(50, t + 0.25);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(t);
    }

    // ダッシュ音（シュンという高速回避音）
    playDash() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.16);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.16);
    }

    // 必殺バースト音
    playBurst() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);

        gain.gain.setValueAtTime(0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
    }

    // EXPオーブ獲得音（キラリとした電子音）
    playExp() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C
        const f = freqs[Math.floor(Math.random() * freqs.length)];

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
    }

    // レベルアップ音（華やかなアルペジオ）
    playLevelUp() {
        if (!this.enabled || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880]; // A, C#, E, A
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.25);
        });
    }

    // プレイヤー被弾音
    playPlayerDamage() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    // サイバーパンク風 ミニマルBGMループ
    startBGM() {
        if (this.bgmPlaying || !this.enabled) return;
        this.resume();
        this.bgmPlaying = true;

        const bassline = [110, 110, 130.81, 110, 146.83, 130.81, 98, 123.47]; // A bass
        this.bgmInterval = setInterval(() => {
            if (!this.bgmPlaying || !this.ctx) return;
            const t = this.ctx.currentTime;
            const note = bassline[this.bgmStep % bassline.length];

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note / 2, t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(350, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.18);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.18);

            this.bgmStep++;
        }, 220);
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}

window.soundSystem = new SoundSystem();
