/**
 * CYBER ARENA: 3D SURVIVOR
 * Three.js 3D アリーナアクションサバイバルゲーム
 */

(function () {
    'use strict';

    // MARK: - Game State & Constants
    const ARENA_RADIUS = 28;
    const STATE_PLAYING = 'PLAYING';
    const STATE_LEVEL_UP = 'LEVEL_UP';
    const STATE_GAME_OVER = 'GAME_OVER';

    let gameState = STATE_PLAYING;
    let clock = new THREE.Clock();
    let gameTime = 0;
    let kills = 0;
    let score = 0;

    // MARK: - Input State
    const input = {
        x: 0,
        y: 0,
        attack: false,
        dash: false,
        burst: false,
        isTouch: false
    };

    const keys = {};

    // MARK: - Three.js Core
    let scene, camera, renderer;
    let container = document.getElementById('canvas-container');

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x060919);
        scene.fog = new THREE.FogExp2(0x060919, 0.018);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
        camera.position.set(0, 22, 22);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        window.addEventListener('resize', onWindowResize);

        setupLighting();
        setupArena();
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // MARK: - Lighting
    let playerPointLight;

    function setupLighting() {
        const ambient = new THREE.AmbientLight(0x223355, 0.9);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xaaccff, 1.2);
        dirLight.position.set(25, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        scene.add(dirLight);

        // プレイヤー追従用ネオンライト
        playerPointLight = new THREE.PointLight(0x00f0ff, 2, 12);
        playerPointLight.position.set(0, 2, 0);
        scene.add(playerPointLight);
    }

    // MARK: - Arena Floor & Decor
    function setupArena() {
        // メインアリーナ床（円形）
        const floorGeo = new THREE.CylinderGeometry(ARENA_RADIUS, ARENA_RADIUS + 1, 1.5, 48);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0c1228,
            roughness: 0.4,
            metalness: 0.6
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.75;
        floor.receiveShadow = true;
        scene.add(floor);

        // 床のグリッドライン
        const grid = new THREE.GridHelper(ARENA_RADIUS * 2, 32, 0x00f0ff, 0x142044);
        grid.position.y = 0.02;
        scene.add(grid);

        // 外周ネオンリング
        const ringGeo = new THREE.RingGeometry(ARENA_RADIUS - 0.4, ARENA_RADIUS + 0.2, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        scene.add(ring);

        // 周囲に浮遊するサイバーピラー
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x101a38,
            roughness: 0.3,
            metalness: 0.8
        });
        const pillarEmissiveMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = ARENA_RADIUS + 5 + (i % 3) * 2;
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const py = (i % 2 === 0 ? 3 : -1);

            const pillarGroup = new THREE.Group();
            const pGeo = new THREE.BoxGeometry(1.4, 12, 1.4);
            const pMesh = new THREE.Mesh(pGeo, pillarMat);
            pillarGroup.add(pMesh);

            const edgeGeo = new THREE.BoxGeometry(1.45, 0.4, 1.45);
            const edgeMesh = new THREE.Mesh(edgeGeo, pillarEmissiveMat);
            edgeMesh.position.y = 3;
            pillarGroup.add(edgeMesh);

            pillarGroup.position.set(px, py, pz);
            scene.add(pillarGroup);
        }
    }

    // MARK: - Player Class
    class Player {
        constructor() {
            this.maxHp = 100;
            this.hp = 100;
            this.level = 1;
            this.exp = 0;
            this.nextExp = 10;
            this.speed = 11;
            this.damage = 35;
            this.attackRange = 4.2;
            this.attackCooldown = 0.28;
            this.lastAttackTime = 0;

            this.dashCooldown = 2.0;
            this.lastDashTime = -999;
            this.isDashing = false;
            this.dashDuration = 0.16;
            this.dashTimer = 0;
            this.dashDirection = new THREE.Vector3();

            this.burstCooldown = 8.0;
            this.lastBurstTime = -999;

            this.invincible = false;
            this.invincibleTimer = 0;

            // アップグレードステータス
            this.hasDrone = false;
            this.droneCount = 0;
            this.droneAngle = 0;
            this.droneMeshes = [];
            this.lastDroneShootTime = 0;

            this.mesh = this.createMesh();
            scene.add(this.mesh);

            // スラッシュエフェクト用メッシュ
            this.slashMesh = this.createSlashEffect();
            scene.add(this.slashMesh);
            this.slashTimer = 0;
        }

        createMesh() {
            const group = new THREE.Group();

            // 胴体
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.35, 1.2, 8);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 1.0;
            body.castShadow = true;
            group.add(body);

            // 光る胸コア
            const coreGeo = new THREE.SphereGeometry(0.2, 8, 8);
            const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const core = new THREE.Mesh(coreGeo, coreMat);
            core.position.set(0, 1.1, 0.4);
            group.add(core);

            // 頭部・バイザー
            const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
            const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.y = 1.9;
            head.castShadow = true;
            group.add(head);

            const visorGeo = new THREE.BoxGeometry(0.5, 0.18, 0.2);
            const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 1.9, 0.25);
            group.add(visor);

            // エナジーブレード（剣）
            const bladeGroup = new THREE.Group();
            const hiltGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
            const hiltMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
            const hilt = new THREE.Mesh(hiltGeo, hiltMat);
            hilt.rotation.x = Math.PI / 2;
            bladeGroup.add(hilt);

            const bladeGeo = new THREE.BoxGeometry(0.12, 1.8, 0.04);
            const bladeMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.set(0, 1.0, 0);
            blade.rotation.z = -Math.PI / 8;
            bladeGroup.add(blade);

            bladeGroup.position.set(0.7, 1.0, 0.3);
            bladeGroup.name = 'weapon';
            group.add(bladeGroup);

            return group;
        }

        createSlashEffect() {
            const shape = new THREE.RingGeometry(1.2, 3.8, 16, 1, 0, Math.PI * 0.9);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(shape, mat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.visible = false;
            return mesh;
        }

        addDrone() {
            this.hasDrone = true;
            this.droneCount++;

            const droneGroup = new THREE.Group();
            const dGeo = new THREE.OctahedronGeometry(0.35);
            const dMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
            const dMesh = new THREE.Mesh(dGeo, dMat);
            droneGroup.add(dMesh);
            scene.add(droneGroup);
            this.droneMeshes.push(droneGroup);
        }

        update(dt) {
            // ダッシュ処理
            if (this.isDashing) {
                this.dashTimer -= dt;
                const dashSpeed = this.speed * 2.8;
                this.mesh.position.addScaledVector(this.dashDirection, dashSpeed * dt);
                createDashTrail(this.mesh.position);

                if (this.dashTimer <= 0) {
                    this.isDashing = false;
                }
            } else {
                // 通常移動
                const moveVec = new THREE.Vector3(input.x, 0, input.y);
                if (moveVec.lengthSq() > 0.01) {
                    moveVec.normalize();
                    this.mesh.position.addScaledVector(moveVec, this.speed * dt);

                    // 進行方向を向く
                    const targetAngle = Math.atan2(moveVec.x, moveVec.z);
                    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetAngle, 16 * dt);
                }
            }

            // アリーナ境界制限
            const currentDist = Math.hypot(this.mesh.position.x, this.mesh.position.z);
            if (currentDist > ARENA_RADIUS - 1) {
                const angle = Math.atan2(this.mesh.position.z, this.mesh.position.x);
                this.mesh.position.x = Math.cos(angle) * (ARENA_RADIUS - 1);
                this.mesh.position.z = Math.sin(angle) * (ARENA_RADIUS - 1);
            }

            // プレイヤー位置にライト追従
            playerPointLight.position.set(this.mesh.position.x, 2.5, this.mesh.position.z);

            // 無敵点滅
            if (this.invincible) {
                this.invincibleTimer -= dt;
                this.mesh.visible = Math.floor(Date.now() / 60) % 2 === 0;
                if (this.invincibleTimer <= 0) {
                    this.invincible = false;
                    this.mesh.visible = true;
                }
            }

            // 斬撃エフェクト更新
            if (this.slashTimer > 0) {
                this.slashTimer -= dt;
                const progress = 1 - (this.slashTimer / 0.18);
                this.slashMesh.material.opacity = (1 - progress) * 0.8;
                this.slashMesh.scale.setScalar(1 + progress * 0.3);
                if (this.slashTimer <= 0) {
                    this.slashMesh.visible = false;
                }
            }

            // ドローンの更新
            if (this.hasDrone) {
                this.droneAngle += dt * 2.5;
                const radius = 2.4;
                for (let i = 0; i < this.droneMeshes.length; i++) {
                    const offset = (i / this.droneMeshes.length) * Math.PI * 2;
                    const a = this.droneAngle + offset;
                    const dx = this.mesh.position.x + Math.cos(a) * radius;
                    const dz = this.mesh.position.z + Math.sin(a) * radius;
                    const dy = this.mesh.position.y + 1.6 + Math.sin(Date.now() * 0.005 + i) * 0.2;
                    this.droneMeshes[i].position.set(dx, dy, dz);
                    this.droneMeshes[i].rotation.y += dt * 3;
                }

                // ドローン自動射撃
                if (gameTime - this.lastDroneShootTime > 0.6) {
                    this.shootDroneLaser();
                    this.lastDroneShootTime = gameTime;
                }
            }

            // 入力チェック（攻撃・ダッシュ・バースト）
            if (input.attack) {
                this.attack();
            }
            if (input.dash) {
                this.dash();
                input.dash = false;
            }
            if (input.burst) {
                this.burst();
                input.burst = false;
            }
        }

        attack() {
            if (gameTime - this.lastAttackTime < this.attackCooldown) return;
            this.lastAttackTime = gameTime;

            if (window.soundSystem) window.soundSystem.playSlash();

            // 剣の振りアニメーション
            const weapon = this.mesh.getObjectByName('weapon');
            if (weapon) {
                weapon.rotation.x = Math.PI / 2;
                setTimeout(() => { weapon.rotation.x = 0; }, 140);
            }

            // スラッシュエフェクト表示
            this.slashMesh.position.copy(this.mesh.position);
            this.slashMesh.position.y += 0.8;
            this.slashMesh.rotation.z = -this.mesh.rotation.y + Math.PI * 0.05;
            this.slashMesh.visible = true;
            this.slashMesh.material.opacity = 0.9;
            this.slashMesh.scale.setScalar(this.attackRange / 3.5);
            this.slashTimer = 0.18;

            // 攻撃判定（前方扇形）
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            const hitList = [];

            for (let enemy of enemies) {
                if (enemy.dead) continue;
                const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, this.mesh.position);
                const dist = toEnemy.length();

                if (dist <= this.attackRange) {
                    toEnemy.normalize();
                    const dot = forward.dot(toEnemy);
                    if (dot > 0.35) { // 前方約140度
                        hitList.push(enemy);
                    }
                }
            }

            for (let enemy of hitList) {
                enemy.takeDamage(this.damage, forward);
            }
        }

        dash() {
            if (gameTime - this.lastDashTime < this.dashCooldown || this.isDashing) return;
            this.lastDashTime = gameTime;
            this.isDashing = true;
            this.dashTimer = this.dashDuration;

            // 移動入力方向、なければ向いている方向
            if (Math.hypot(input.x, input.y) > 0.1) {
                this.dashDirection.set(input.x, 0, input.y).normalize();
            } else {
                this.dashDirection.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            }

            this.invincible = true;
            this.invincibleTimer = 0.28;
            if (window.soundSystem) window.soundSystem.playDash();
        }

        burst() {
            if (gameTime - this.lastBurstTime < this.burstCooldown) return;
            this.lastBurstTime = gameTime;

            if (window.soundSystem) window.soundSystem.playBurst();

            // 360度全方位衝撃波エフェクト
            createShockwave(this.mesh.position, 9, 0xaa00ff);

            // 範囲内の全敵に大ダメージ
            for (let enemy of enemies) {
                if (enemy.dead) continue;
                const dist = this.mesh.position.distanceTo(enemy.mesh.position);
                if (dist < 8.5) {
                    const knockDir = new THREE.Vector3().subVectors(enemy.mesh.position, this.mesh.position).normalize();
                    enemy.takeDamage(this.damage * 2.2, knockDir);
                }
            }
        }

        shootDroneLaser() {
            if (enemies.length === 0) return;
            // 最も近い敵を探す
            let closest = null;
            let minDist = 16;
            for (let e of enemies) {
                if (e.dead) continue;
                const d = this.mesh.position.distanceTo(e.mesh.position);
                if (d < minDist) {
                    minDist = d;
                    closest = e;
                }
            }
            if (closest) {
                const origin = this.droneMeshes[0].position.clone();
                const target = closest.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0));
                createLaserBeam(origin, target, 0x00ffaa);
                closest.takeDamage(this.damage * 0.6, new THREE.Vector3());
            }
        }

        takeDamage(dmg) {
            if (this.invincible || this.isDashing || gameState !== STATE_PLAYING) return;
            this.hp = Math.max(0, this.hp - dmg);
            this.invincible = true;
            this.invincibleTimer = 0.6;

            if (window.soundSystem) window.soundSystem.playPlayerDamage();
            updateHUD();

            if (this.hp <= 0) {
                onGameOver();
            }
        }

        addExp(amount) {
            this.exp += amount;
            score += amount * 10;
            if (window.soundSystem) window.soundSystem.playExp();

            if (this.exp >= this.nextExp) {
                this.exp -= this.nextExp;
                this.level++;
                this.nextExp = Math.floor(this.nextExp * 1.5) + 5;
                if (window.soundSystem) window.soundSystem.playLevelUp();
                triggerLevelUp();
            }
            updateHUD();
        }
    }

    // MARK: - Enemies
    const enemies = [];
    const enemyProjectiles = [];

    class Enemy {
        constructor(type, position) {
            this.type = type; // 'crawler', 'shooter', 'titan'
            this.dead = false;

            if (type === 'crawler') {
                this.maxHp = 40 + gameTime * 0.8;
                this.speed = 5.2;
                this.damage = 12;
                this.mesh = this.createCrawlerMesh();
            } else if (type === 'shooter') {
                this.maxHp = 60 + gameTime * 1.0;
                this.speed = 3.4;
                this.damage = 16;
                this.shootCooldown = 2.2;
                this.lastShootTime = gameTime + Math.random() * 2;
                this.mesh = this.createShooterMesh();
            } else if (type === 'titan') {
                this.maxHp = 280 + gameTime * 3.0;
                this.speed = 2.2;
                this.damage = 30;
                this.mesh = this.createTitanMesh();
            }

            this.hp = this.maxHp;
            this.mesh.position.copy(position);
            scene.add(this.mesh);
        }

        createCrawlerMesh() {
            const geo = new THREE.ConeGeometry(0.7, 1.2, 5);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.3, metalness: 0.7 });
            const m = new THREE.Mesh(geo, mat);
            m.rotation.x = Math.PI / 2;
            m.position.y = 0.6;
            m.castShadow = true;
            return m;
        }

        createShooterMesh() {
            const group = new THREE.Group();
            const geo = new THREE.DodecahedronGeometry(0.8);
            const mat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.3, metalness: 0.8 });
            const m = new THREE.Mesh(geo, mat);
            m.castShadow = true;
            group.add(m);

            // コア
            const eyeGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(0, 0, 0.6);
            group.add(eye);

            group.position.y = 1.6;
            return group;
        }

        createTitanMesh() {
            const group = new THREE.Group();
            const bodyGeo = new THREE.BoxGeometry(2.4, 3.2, 2.4);
            const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4, metalness: 0.8 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 2.0;
            body.castShadow = true;
            group.add(body);

            const eyeGeo = new THREE.BoxGeometry(1.6, 0.4, 0.3);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(0, 2.8, 1.2);
            group.add(eye);

            return group;
        }

        update(dt) {
            if (this.dead || !player) return;

            const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position);
            const dist = toPlayer.length();

            if (this.type === 'crawler') {
                // プレイヤーへ猛進
                toPlayer.y = 0;
                toPlayer.normalize();
                this.mesh.position.addScaledVector(toPlayer, this.speed * dt);
                this.mesh.lookAt(player.mesh.position.x, this.mesh.position.y, player.mesh.position.z);

                // プレイヤー接触攻撃
                if (dist < 1.3) {
                    player.takeDamage(this.damage);
                }
            } else if (this.type === 'shooter') {
                // 距離を保つ（7〜11ユニット）
                toPlayer.y = 0;
                this.mesh.lookAt(player.mesh.position.x, this.mesh.position.y, player.mesh.position.z);
                toPlayer.normalize();

                if (dist > 11) {
                    this.mesh.position.addScaledVector(toPlayer, this.speed * dt);
                } else if (dist < 7) {
                    this.mesh.position.addScaledVector(toPlayer, -this.speed * dt);
                }

                // 射撃
                if (gameTime - this.lastShootTime > this.shootCooldown) {
                    this.shoot();
                    this.lastShootTime = gameTime;
                }
            } else if (this.type === 'titan') {
                // ゆっくり接近し、巨大衝撃
                toPlayer.y = 0;
                toPlayer.normalize();
                this.mesh.position.addScaledVector(toPlayer, this.speed * dt);
                this.mesh.lookAt(player.mesh.position.x, this.mesh.position.y, player.mesh.position.z);

                if (dist < 2.5) {
                    player.takeDamage(this.damage);
                }
            }
        }

        shoot() {
            const dir = new THREE.Vector3().subVectors(player.mesh.position, this.mesh.position).normalize();
            const projGeo = new THREE.SphereGeometry(0.35, 8, 8);
            const projMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
            const proj = new THREE.Mesh(projGeo, projMat);
            proj.position.copy(this.mesh.position);
            proj.position.y += 0.5;
            scene.add(proj);

            enemyProjectiles.push({
                mesh: proj,
                velocity: dir.multiplyScalar(9),
                life: 4.0
            });
        }

        takeDamage(dmg, knockbackDir) {
            this.hp -= dmg;
            if (window.soundSystem) window.soundSystem.playHit();

            // ダメージポップアップ
            createDamageNumber(this.mesh.position, Math.round(dmg));

            // ノックバック
            if (this.type !== 'titan') {
                this.mesh.position.addScaledVector(knockbackDir, 1.2);
            }

            // 被弾フラッシュ
            this.mesh.traverse((c) => {
                if (c.material && c.material.color) {
                    const orig = c.material.color.getHex();
                    c.material.color.setHex(0xffffff);
                    setTimeout(() => { if (c.material) c.material.color.setHex(orig); }, 80);
                }
            });

            if (this.hp <= 0 && !this.dead) {
                this.die();
            }
        }

        die() {
            this.dead = true;
            kills++;
            score += this.type === 'titan' ? 500 : 50;

            if (window.soundSystem) window.soundSystem.playExplosion();

            // 爆発パーティクル
            createExplosion(this.mesh.position, this.type === 'titan' ? 0xffbb00 : 0xff0055);

            // 経験値オーブをドロップ
            const orbCount = this.type === 'titan' ? 6 : (this.type === 'shooter' ? 2 : 1);
            for (let i = 0; i < orbCount; i++) {
                const offset = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5);
                spawnExpOrb(this.mesh.position.clone().add(offset));
            }

            scene.remove(this.mesh);
        }
    }

    // MARK: - EXP Orbs
    const expOrbs = [];

    function spawnExpOrb(pos) {
        const geo = new THREE.OctahedronGeometry(0.28);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.y = 0.5;
        scene.add(mesh);

        expOrbs.push({
            mesh: mesh,
            value: 1
        });
    }

    function updateExpOrbs(dt) {
        for (let i = expOrbs.length - 1; i >= 0; i--) {
            const orb = expOrbs[i];
            orb.mesh.rotation.y += dt * 3;
            orb.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.006 + i) * 0.15;

            // プレイヤーとの距離
            const dist = player.mesh.position.distanceTo(orb.mesh.position);
            const magnetDist = 5.0;

            if (dist < magnetDist) {
                // 吸い寄せ
                const toPlayer = new THREE.Vector3().subVectors(player.mesh.position, orb.mesh.position).normalize();
                const speed = 14 + (1 - dist / magnetDist) * 12;
                orb.mesh.position.addScaledVector(toPlayer, speed * dt);

                if (dist < 1.0) {
                    player.addExp(orb.value);
                    scene.remove(orb.mesh);
                    expOrbs.splice(i, 1);
                }
            }
        }
    }

    // MARK: - Particles & Visual Effects
    const particles = [];

    function createExplosion(pos, colorHex) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const mat = new THREE.MeshBasicMaterial({ color: colorHex });
            const m = new THREE.Mesh(geo, mat);
            m.position.copy(pos);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 12
            );

            scene.add(m);
            particles.push({
                mesh: m,
                velocity: vel,
                life: 0.6,
                maxLife: 0.6
            });
        }
    }

    function createDashTrail(pos) {
        const geo = new THREE.BoxGeometry(0.8, 1.4, 0.4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.5 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.position.y += 0.8;
        scene.add(m);

        particles.push({
            mesh: m,
            velocity: new THREE.Vector3(),
            life: 0.18,
            maxLife: 0.18
        });
    }

    function createShockwave(pos, maxRadius, colorHex) {
        const geo = new THREE.RingGeometry(0.5, 1.2, 32);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        m.position.y = 0.2;
        m.rotation.x = -Math.PI / 2;
        scene.add(m);

        let radius = 1.0;
        const interval = setInterval(() => {
            radius += 1.2;
            m.scale.setScalar(radius);
            m.material.opacity = Math.max(0, 1 - radius / maxRadius);
            if (radius >= maxRadius) {
                clearInterval(interval);
                scene.remove(m);
            }
        }, 16);
    }

    function createLaserBeam(from, to, colorHex) {
        const points = [from, to];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 3 });
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        setTimeout(() => { scene.remove(line); }, 100);
    }

    function createDamageNumber(pos, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#ff0055';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(amount.toString(), 64, 44);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.position.y += 1.8;
        sprite.scale.set(1.8, 0.9, 1);
        scene.add(sprite);

        particles.push({
            mesh: sprite,
            velocity: new THREE.Vector3(0, 2.5, 0),
            life: 0.45,
            maxLife: 0.45
        });
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            p.mesh.position.addScaledVector(p.velocity, dt);

            if (p.mesh.material && p.mesh.material.transparent) {
                p.mesh.material.opacity = p.life / p.maxLife;
            }

            if (p.life <= 0) {
                scene.remove(p.mesh);
                particles.splice(i, 1);
            }
        }
    }

    // MARK: - Spawner
    let lastSpawnTime = 0;
    let titanSpawned = false;

    function updateSpawner(dt) {
        const spawnInterval = Math.max(0.6, 2.4 - gameTime * 0.02);

        if (gameTime - lastSpawnTime > spawnInterval && enemies.length < 50) {
            lastSpawnTime = gameTime;

            // アリーナ外周からスポーン
            const angle = Math.random() * Math.PI * 2;
            const dist = ARENA_RADIUS - 1.5;
            const sx = Math.cos(angle) * dist;
            const sz = Math.sin(angle) * dist;
            const pos = new THREE.Vector3(sx, 0, sz);

            // 確率でシューターまたはクローラー
            const type = (gameTime > 15 && Math.random() < 0.3) ? 'shooter' : 'crawler';
            enemies.push(new Enemy(type, pos));
        }

        // 35秒毎にタイタンボス出現
        if (Math.floor(gameTime) % 35 === 0 && Math.floor(gameTime) > 0 && !titanSpawned) {
            titanSpawned = true;
            const pos = new THREE.Vector3(0, 0, -ARENA_RADIUS + 4);
            enemies.push(new Enemy('titan', pos));
        } else if (Math.floor(gameTime) % 35 !== 0) {
            titanSpawned = false;
        }
    }

    // MARK: - HUD & UI
    const hpBar = document.getElementById('hp-bar');
    const hpText = document.getElementById('hp-text');
    const expBar = document.getElementById('exp-bar');
    const levelBadge = document.getElementById('level-badge');
    const timerDisplay = document.getElementById('timer-display');
    const killsDisplay = document.getElementById('kills-display');
    const levelUpModal = document.getElementById('level-up-modal');
    const upgradeCards = document.getElementById('upgrade-cards');
    const gameOverModal = document.getElementById('game-over-modal');

    function updateHUD() {
        if (!player) return;
        const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
        hpBar.style.width = hpPercent + '%';
        hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

        const expPercent = Math.min(100, (player.exp / player.nextExp) * 100);
        expBar.style.width = expPercent + '%';
        levelBadge.textContent = `LV ${player.level}`;

        const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
        const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
        killsDisplay.textContent = `討伐: ${kills}体 | SCORE: ${score}`;
    }

    // MARK: - Level Up System
    const UPGRADE_POOL = [
        { id: 'power', icon: '⚔️', name: 'ブレード強化', desc: '斬撃の攻撃力 +25%' },
        { id: 'range', icon: '🌪️', name: '斬撃レンジ拡大', desc: '攻撃範囲 +30%' },
        { id: 'speed', icon: '⚡️', name: 'ハイスピード', desc: '移動速度 +15%' },
        { id: 'dash', icon: '💨', name: 'ダッシュ短縮', desc: 'ダッシュのクールダウン 30% 短縮' },
        { id: 'drone', icon: '🛸', name: '追尾ビット追加', desc: '周囲を周回し自動射撃するドローンを追加' },
        { id: 'heal', icon: '💖', name: '完全修復 & 増強', desc: 'HP全回復 + 最大HP +25' }
    ];

    function triggerLevelUp() {
        gameState = STATE_LEVEL_UP;
        levelUpModal.style.display = 'flex';
        upgradeCards.innerHTML = '';

        // シャッフルして3つ選択
        const shuffled = [...UPGRADE_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);

        shuffled.forEach(item => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `
                <div class="card-icon">${item.icon}</div>
                <div class="card-name">${item.name}</div>
                <div class="card-desc">${item.desc}</div>
            `;
            card.onclick = () => selectUpgrade(item.id);
            upgradeCards.appendChild(card);
        });
    }

    function selectUpgrade(id) {
        if (!player) return;

        if (id === 'power') {
            player.damage = Math.round(player.damage * 1.25);
        } else if (id === 'range') {
            player.attackRange *= 1.3;
        } else if (id === 'speed') {
            player.speed *= 1.15;
        } else if (id === 'dash') {
            player.dashCooldown *= 0.7;
        } else if (id === 'drone') {
            player.addDrone();
        } else if (id === 'heal') {
            player.maxHp += 25;
            player.hp = player.maxHp;
        }

        levelUpModal.style.display = 'none';
        gameState = STATE_PLAYING;
    }

    // MARK: - Game Over
    function onGameOver() {
        gameState = STATE_GAME_OVER;
        gameOverModal.style.display = 'flex';

        const mins = Math.floor(gameTime / 60).toString().padStart(2, '0');
        const secs = Math.floor(gameTime % 60).toString().padStart(2, '0');
        document.getElementById('go-time').textContent = `${mins}:${secs}`;
        document.getElementById('go-kills').textContent = `${kills}体`;
        document.getElementById('go-level').textContent = `LV ${player.level}`;
        document.getElementById('go-score').textContent = score.toString();

        if (window.soundSystem) window.soundSystem.stopBGM();
    }

    document.getElementById('btn-restart').onclick = () => {
        restartGame();
    };

    function restartGame() {
        // オブジェクトの破棄
        for (let e of enemies) scene.remove(e.mesh);
        enemies.length = 0;
        for (let p of enemyProjectiles) scene.remove(p.mesh);
        enemyProjectiles.length = 0;
        for (let o of expOrbs) scene.remove(o.mesh);
        expOrbs.length = 0;
        for (let pt of particles) scene.remove(pt.mesh);
        particles.length = 0;

        if (player) {
            scene.remove(player.mesh);
            scene.remove(player.slashMesh);
            for (let d of player.droneMeshes) scene.remove(d);
        }

        gameTime = 0;
        kills = 0;
        score = 0;
        player = new Player();

        gameOverModal.style.display = 'none';
        gameState = STATE_PLAYING;
        updateHUD();

        if (window.soundSystem) window.soundSystem.startBGM();
    }

    // MARK: - Inputs Setup
    function setupInputs() {
        // キーボード
        window.addEventListener('keydown', (e) => {
            keys[e.code] = true;
            if (e.code === 'Space') input.attack = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.dash = true;
            if (e.code === 'KeyE' || e.code === 'KeyQ') input.burst = true;

            // 初回操作時にサウンド開始
            if (window.soundSystem) {
                window.soundSystem.resume();
                window.soundSystem.startBGM();
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.code] = false;
            if (e.code === 'Space') input.attack = false;
        });

        // マウスクリック攻撃 & 右クリックダッシュ
        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('#ui-layer') && !e.target.closest('#canvas-container')) return;
            if (e.button === 0) input.attack = true;
            if (e.button === 2) input.dash = true;

            if (window.soundSystem) {
                window.soundSystem.resume();
                window.soundSystem.startBGM();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) input.attack = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // タッチ操作セットアップ（iPhone / スマホ対応）
        setupTouchControls();
    }

    function setupTouchControls() {
        const touchContainer = document.getElementById('touch-controls');
        const joystickArea = document.getElementById('joystick-area');
        const joystickKnob = document.getElementById('joystick-knob');
        const btnAttack = document.getElementById('btn-attack');
        const btnDash = document.getElementById('btn-dash');
        const btnBurst = document.getElementById('btn-burst');

        // タッチイベント検出または画面幅による自動表示
        const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
        if (isMobileDevice) {
            input.isTouch = true;
            touchContainer.style.display = 'block';
        }

        const enableTouchUI = () => {
            input.isTouch = true;
            touchContainer.style.display = 'block';
            if (window.soundSystem) {
                window.soundSystem.resume();
                window.soundSystem.startBGM();
            }
        };

        window.addEventListener('touchstart', enableTouchUI, { once: true, passive: true });

        // バーチャルジョイスティック
        let touchId = null;
        let startX = 0, startY = 0;
        const maxRadius = 45;

        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            touchId = touch.identifier;
            const rect = joystickArea.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            updateJoystick(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (touchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    break;
                }
            }
        }, { passive: true });

        const endJoystick = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    input.x = 0;
                    input.y = 0;
                    joystickKnob.style.transform = `translate(0px, 0px)`;
                    break;
                }
            }
        };

        window.addEventListener('touchend', endJoystick, { passive: true });
        window.addEventListener('touchcancel', endJoystick, { passive: true });

        function updateJoystick(cx, cy) {
            let dx = cx - startX;
            let dy = cy - startY;
            const dist = Math.hypot(dx, dy);

            if (dist > maxRadius) {
                dx = (dx / dist) * maxRadius;
                dy = (dy / dist) * maxRadius;
            }

            joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

            input.x = dx / maxRadius;
            input.y = dy / maxRadius;
        }

        // アクションボタン
        btnAttack.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.attack = true;
        }, { passive: false });
        btnAttack.addEventListener('touchend', () => { input.attack = false; }, { passive: true });

        btnDash.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.dash = true;
        }, { passive: false });

        btnBurst.addEventListener('touchstart', (e) => {
            e.preventDefault();
            input.burst = true;
        }, { passive: false });
    }

    function processKeyboardInput() {
        if (input.isTouch) return;

        let kx = 0;
        let ky = 0;

        if (keys['KeyW'] || keys['ArrowUp']) ky -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) ky += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) kx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) kx += 1;

        input.x = kx;
        input.y = ky;
    }

    // MARK: - Main Game Loop
    let player;

    function main() {
        initThree();
        setupInputs();

        player = new Player();

        // 初期敵をスポーン（近接クローラー2体、遠距離シューター1体）
        enemies.push(new Enemy('crawler', new THREE.Vector3(6, 0, -8)));
        enemies.push(new Enemy('crawler', new THREE.Vector3(-7, 0, -6)));
        enemies.push(new Enemy('shooter', new THREE.Vector3(0, 0, -12)));

        updateHUD();

        requestAnimationFrame(gameLoop);
    }

    function gameLoop() {
        requestAnimationFrame(gameLoop);

        const dt = Math.min(clock.getDelta(), 0.1);

        if (gameState === STATE_PLAYING) {
            gameTime += dt;

            processKeyboardInput();
            player.update(dt);

            // 敵の更新
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                enemy.update(dt);
                if (enemy.dead) {
                    enemies.splice(i, 1);
                }
            }

            // 敵の弾の更新
            for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
                const p = enemyProjectiles[i];
                p.life -= dt;
                p.mesh.position.addScaledVector(p.velocity, dt);

                // プレイヤーヒット判定
                if (player.mesh.position.distanceTo(p.mesh.position) < 1.2) {
                    player.takeDamage(15);
                    scene.remove(p.mesh);
                    enemyProjectiles.splice(i, 1);
                    continue;
                }

                if (p.life <= 0) {
                    scene.remove(p.mesh);
                    enemyProjectiles.splice(i, 1);
                }
            }

            updateExpOrbs(dt);
            updateParticles(dt);
            updateSpawner(dt);
            updateHUD();

            // カメラ追従（スムーズ補間）
            const targetCamX = player.mesh.position.x;
            const targetCamZ = player.mesh.position.z + 18;
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, 5 * dt);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 5 * dt);
            camera.lookAt(player.mesh.position.x, 1.0, player.mesh.position.z);
        }

        renderer.render(scene, camera);
    }

    window.addEventListener('DOMContentLoaded', main);
})();
