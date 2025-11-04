        var state = {
            screen: 'start',
            selectedLayout: null,
            photos: [],
            stream: null,
            countdown: null,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        };

        var layouts = {
            1: { cols: 1, rows: 3, count: 3 },
            2: { cols: 1, rows: 4, count: 4 },
            3: { cols: 2, rows: 2, count: 4 }
        };

        var backgrounds = [
            { name: 'Snowflakes', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { name: 'Frosty Blue', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
            { name: 'Pine Forest', gradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
            { name: 'Winter Sky', gradient: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
            { name: 'Christmas', gradient: 'linear-gradient(135deg, #d31027 0%, #ea384d 100%)' }
        ];

        var colors = ['#ffffff', '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec'];

        var screens = {
            start: document.getElementById('start-screen'),
            camera: document.getElementById('camera-screen'),
            customize: document.getElementById('customize-screen'),
            download: document.getElementById('download-screen')
        };

        var video = document.getElementById('video');
        var countdownOverlay = document.getElementById('countdown');
        var previewGrid = document.getElementById('preview-grid');
        var photostripCanvas = document.getElementById('photostrip-canvas');
        var finalCanvas = document.getElementById('final-canvas');

        function createSnowflakes() {
            var container = document.getElementById('snowflakes');
            for (var i = 0; i < 20; i++) {
                var snowflake = document.createElement('div');
                snowflake.className = 'snowflake';
                snowflake.textContent = '❄';
                snowflake.style.left = Math.random() * 100 + '%';
                snowflake.style.top = Math.random() * 100 + '%';
                snowflake.style.fontSize = (Math.random() * 20 + 10) + 'px';
                container.appendChild(snowflake);
            }
        }

        function showScreen(screenName) {
            for (var key in screens) {
                screens[key].classList.remove('active');
            }
            screens[screenName].classList.add('active');
            state.screen = screenName;
        }

        var layoutCards = document.querySelectorAll('.layout-card');
        for (var i = 0; i < layoutCards.length; i++) {
            layoutCards[i].addEventListener('click', function() {
                var allCards = document.querySelectorAll('.layout-card');
                for (var j = 0; j < allCards.length; j++) {
                    allCards[j].classList.remove('selected');
                }
                this.classList.add('selected');
                state.selectedLayout = parseInt(this.dataset.layout);
                document.getElementById('start-btn').style.display = 'flex';
            });
        }

        document.getElementById('start-btn').addEventListener('click', function() {
            showScreen('camera');
            startCamera();
            updatePreviewGrid();
        });

        function startCamera() {
            navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
                .then(function(mediaStream) {
                    state.stream = mediaStream;
                    video.srcObject = mediaStream;
                })
                .catch(function(err) {
                    alert('Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff.');
                });
        }

        function updatePreviewGrid() {
            var layout = layouts[state.selectedLayout];
            previewGrid.style.gridTemplateColumns = 'repeat(' + layout.cols + ', 1fr)';
            previewGrid.style.gridTemplateRows = 'repeat(' + layout.rows + ', 1fr)';
            previewGrid.innerHTML = '';
            
            for (var i = 0; i < layout.count; i++) {
                var slot = document.createElement('div');
                slot.className = 'preview-slot';
                if (state.photos[i]) {
                    var img = document.createElement('img');
                    img.src = state.photos[i];
                    slot.appendChild(img);
                }
                previewGrid.appendChild(slot);
            }
        }

        function updatePhotoCounter() {
            var layout = layouts[state.selectedLayout];
            var counter = document.getElementById('photo-counter');
            counter.textContent = '(' + (state.photos.length + 1) + '/' + layout.count + ')';
        }

        document.getElementById('capture-btn').addEventListener('click', function() {
            var count = 3;
            countdownOverlay.textContent = count;
            countdownOverlay.classList.add('active');
            document.getElementById('capture-btn').disabled = true;

            var interval = setInterval(function() {
                count--;
                if (count === 0) {
                    clearInterval(interval);
                    takePhoto();
                    countdownOverlay.classList.remove('active');
                    document.getElementById('capture-btn').disabled = false;
                } else {
                    countdownOverlay.textContent = count;
                }
            }, 1000);
        });

        function takePhoto() {
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            var photoData = canvas.toDataURL('image/png');
            state.photos.push(photoData);
            
            updatePreviewGrid();
            updatePhotoCounter();

            var layout = layouts[state.selectedLayout];
            if (state.photos.length === layout.count) {
                document.getElementById('capture-btn').style.display = 'none';
                document.getElementById('camera-actions').style.display = 'flex';
            }
        }

        document.getElementById('retake-btn').addEventListener('click', function() {
            state.photos = [];
            updatePreviewGrid();
            updatePhotoCounter();
            document.getElementById('capture-btn').style.display = 'block';
            document.getElementById('camera-actions').style.display = 'none';
        });

        document.getElementById('next-btn').addEventListener('click', function() {
            if (state.stream) {
                var tracks = state.stream.getTracks();
                for (var i = 0; i < tracks.length; i++) {
                    tracks[i].stop();
                }
            }
            showScreen('customize');
            setupCustomization();
            generatePhotostrip(photostripCanvas);
        });

        function setupCustomization() {
            var bgGrid = document.getElementById('bg-grid');
            bgGrid.innerHTML = '';
            for (var i = 0; i < backgrounds.length; i++) {
                var bg = backgrounds[i];
                var div = document.createElement('div');
                div.className = 'bg-option' + (i === 0 ? ' selected' : '');
                div.style.background = bg.gradient;
                div.title = bg.name;
                div.dataset.gradient = bg.gradient;
                div.addEventListener('click', function() {
                    var allBg = document.querySelectorAll('.bg-option');
                    for (var j = 0; j < allBg.length; j++) {
                        allBg[j].classList.remove('selected');
                    }
                    var allColors = document.querySelectorAll('.color-option');
                    for (var k = 0; k < allColors.length; k++) {
                        allColors[k].classList.remove('selected');
                    }
                    this.classList.add('selected');
                    state.background = this.dataset.gradient;
                    generatePhotostrip(photostripCanvas);
                });
                bgGrid.appendChild(div);
            }

            var colorGrid = document.getElementById('color-grid');
            colorGrid.innerHTML = '';
            for (var i = 0; i < colors.length; i++) {
                var color = colors[i];
                var div = document.createElement('div');
                div.className = 'color-option';
                div.style.backgroundColor = color;
                div.dataset.color = color;
                div.addEventListener('click', function() {
                    var allBg = document.querySelectorAll('.bg-option');
                    for (var j = 0; j < allBg.length; j++) {
                        allBg[j].classList.remove('selected');
                    }
                    var allColors = document.querySelectorAll('.color-option');
                    for (var k = 0; k < allColors.length; k++) {
                        allColors[k].classList.remove('selected');
                    }
                    this.classList.add('selected');
                    state.background = this.dataset.color;
                    generatePhotostrip(photostripCanvas);
                });
                colorGrid.appendChild(div);
            }
        }

        function generatePhotostrip(canvas) {
            var layout = layouts[state.selectedLayout];
            var photoWidth = 400;
            var photoHeight = 300;
            var padding = 20;

            canvas.width = layout.cols * photoWidth + (layout.cols + 1) * padding;
            canvas.height = layout.rows * photoHeight + (layout.rows + 1) * padding;

            var ctx = canvas.getContext('2d');

            if (state.background.indexOf('linear-gradient') === 0) {
                var colorMatches = state.background.match(/#[a-f0-9]{6}/gi);
                if (colorMatches && colorMatches.length >= 2) {
                    var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    grad.addColorStop(0, colorMatches[0]);
                    grad.addColorStop(1, colorMatches[colorMatches.length - 1]);
                    ctx.fillStyle = grad;
                }
            } else {
                ctx.fillStyle = state.background;
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            for (var i = 0; i < 50; i++) {
                var x = Math.random() * canvas.width;
                var y = Math.random() * canvas.height;
                var size = Math.random() * 3 + 1;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }

            for (var idx = 0; idx < state.photos.length; idx++) {
                var photo = state.photos[idx];
                var img = new Image();
                img.src = photo;
                (function(i) {
                    img.onload = function() {
                        var col = i % layout.cols;
                        var row = Math.floor(i / layout.cols);
                        var x = col * photoWidth + (col + 1) * padding;
                        var y = row * photoHeight + (row + 1) * padding;

                        ctx.save();
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                        ctx.shadowBlur = 10;
                        ctx.shadowOffsetX = 0;
                        ctx.shadowOffsetY = 5;
                        ctx.fillStyle = 'white';
                        ctx.fillRect(x - 5, y - 5, photoWidth + 10, photoHeight + 10);
                        ctx.restore();

                        ctx.drawImage(img, x, y, photoWidth, photoHeight);
                    };
                })(idx);
            }
        }

        document.getElementById('customize-next-btn').addEventListener('click', function() {
            showScreen('download');
            generatePhotostrip(finalCanvas);
        });

        document.getElementById('download-btn').addEventListener('click', function() {
            var dataUrl = finalCanvas.toDataURL('image/png');
            var link = document.createElement('a');
            link.download = 'winter-photobooth.png';
            link.href = dataUrl;
            link.click();
        });

        document.getElementById('qr-btn').addEventListener('click', function() {
            var qrContainer = document.getElementById('qr-container');
            var qrDate = document.getElementById('qr-date');
            qrDate.textContent = new Date().toLocaleString('de-DE');
            qrContainer.classList.add('active');
        });

        document.getElementById('restart-btn').addEventListener('click', function() {
            state = {
                screen: 'start',
                selectedLayout: null,
                photos: [],
                stream: null,
                countdown: null,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            };
            var allCards = document.querySelectorAll('.layout-card');
            for (var i = 0; i < allCards.length; i++) {
                allCards[i].classList.remove('selected');
            }
            document.getElementById('start-btn').style.display = 'none';
            document.getElementById('capture-btn').style.display = 'block';
            document.getElementById('camera-actions').style.display = 'none';
            document.getElementById('qr-container').classList.remove('active');
            showScreen('start');
        });

        createSnowflakes();
