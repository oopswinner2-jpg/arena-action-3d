# 🎮 CYBER ARENA: 3D SURVIVOR

Three.js で構築されたスタイリッシュなサイバーパンク風 3D アリーナアクションサバイバルゲームです。
PCブラウザだけでなく、**iPhone の Safari から直接タッチ操作（バーチャルパッド）でプレイ可能**！
PWA（Service Worker）に対応しており、**完全オフラインでも動作**します。

---

## 🚀 GitHub Pages への公開手順（外出先で遊ぶ）

本プロジェクトは GitHub Pages 向けに最適化されています（すべてのパスが相対パス対応、自動デプロイワークフロー同梱）。

### ステップ 1: GitHub で新しいリポジトリを作成
1. [GitHub](https://github.com) にログインし、右上の「+」から **「New repository」** を選択
2. リポジトリ名を入力（例: `arena-action-3d`）
3. 「Public」を選択し、**「Create repository」** をクリック（README等の追加チェックは不要です）

### ステップ 2: ローカルからプッシュ
ターミナルを開き、以下のコマンドを実行します：

```bash
cd /Users/tu/.gemini/antigravity/scratch/arena-action-3d
git remote add origin https://github.com/<あなたのGitHubユーザー名>/arena-action-3d.git
git branch -M main
git push -u origin main
```

### ステップ 3: GitHub Pages を有効化
1. GitHub リポジトリの **「Settings」** タブを開く
2. 左メニューの **「Pages」** を選択
3. **「Build and deployment」** の **「Source」** を **「GitHub Actions」** に変更
   - ※同梱の `.github/workflows/deploy.yml` が自動起動し、数十秒でデプロイが完了します！

### ステップ 4: 外出先の iPhone でアクセス！
完了すると、画面上部に公開URLが表示されます：
👉 **`https://<あなたのGitHubユーザー名>.github.io/arena-action-3d/`**

> [!TIP]
> **iPhoneのホーム画面に追加してアプリ化（オフライン対応）:**
> iPhoneの Safari で上記URLを開き、画面下の共有アイコン（四角から矢印）をタップして **「ホーム画面に追加」** を選択してください。
> アイコンがホーム画面に並び、次回以降は **電車内や地下鉄・機内モード（オフライン）でも通信量ゼロ** で遊べます！

---

## ⚔️ コントロール（操作方法）

| アクション | 💻 PC（Mac） | 📱 モバイル（iPhone） |
| :--- | :--- | :--- |
| **移動** | `W` `A` `S` `D` または 矢印キー | 画面左側の **バーチャルジョイスティック** |
| **斬撃攻撃** | `SPACE` または マウス左クリック | 右側の **[⚔️ ATTACK]** ボタン |
| **ダッシュ回避** | `SHIFT` または マウス右クリック | 右側の **[⚡️ DASH]** ボタン（無敵時間＋残像） |
| **全方位バースト** | `E` または `Q` キー | 右側の **[💥 BURST]** ボタン（衝撃波） |

---

## 🌟 ゲームの特徴

1. **3Dアリーナバトル & 敵バリエーション**:
   - **Crawler（赤小型）**: 素早く群れで突進してくる敵
   - **Shooter（紫中型）**: 距離を保ちながらエネルギー弾を射撃してくるドローン
   - **Titan（金大型ボス）**: 35秒ごとに登場する圧倒的耐久力と攻撃力を持つボス
2. **経験値 & レベルアップビルド**:
   - 敵を撃破するとエナジーオーブ（EXP）がドロップし、プレイヤーにマグネット吸引。
   - レベルアップごとに**3つのランダムスキルカード**から能力を強化（ブレード強化、範囲拡大、自動追尾ドローン、ハイスピード、ダッシュ短縮、HP全回復）。
3. **Web Audio API によるリアルタイムSE & BGM**:
   - 外部mp3ファイルなしで、Web Audio API で斬撃音・爆発音・被弾音・ダッシュ音・ミニマルテクノBGMを完全自前生成。
