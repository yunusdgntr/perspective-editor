document.addEventListener('DOMContentLoaded', function() {
    // DOM Elementleri
    const imageUpload = document.getElementById('imageUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const downloadBtn = document.getElementById('downloadBtn');
    const rectTool = document.getElementById('rectTool');
    const selectTool = document.getElementById('selectTool');
    const fillTool = document.getElementById('fillTool');
    const strokeColor = document.getElementById('strokeColor');
    const fillColor = document.getElementById('fillColor');
    const strokeStyle = document.getElementById('strokeStyle');
    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacityValue');
    const layersContainer = document.getElementById('layers');
    const zoomIn = document.getElementById('zoomIn');
    const zoomOut = document.getElementById('zoomOut');
    const resetZoom = document.getElementById('resetZoom');
    const strokeWidth = document.getElementById('strokeWidth');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    const exportFormat = document.getElementById('exportFormat');
    const langEn = document.getElementById('langEn');
    const langTr = document.getElementById('langTr');
    
    // fillOpacity ve strokeOpacity için düzeltmeler
    const fillOpacity = opacity; // Mevcut opacity kontrolünü kullan
    const fillOpacityValue = opacityValue; // Mevcut opacityValue'yu kullan
    
    // Eğer strokeOpacity elementi yoksa, null olarak bırak
    const strokeOpacity = document.getElementById('strokeOpacity');
    const strokeOpacityValue = document.getElementById('strokeOpacityValue');

    // Uygulama Durumu
    let originalImage = null;
    let shapes = [];
    let currentTool = 'rect';
    let isDrawing = false;
    let currentShape = null;
    let selectedShape = null;
    let selectedCorner = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    // Dil ayarları
    let currentLang = getBrowserLanguage();

    // Araç butonlarını ayarla
    rectTool.classList.add('active');
    rectTool.addEventListener('click', () => setActiveTool('rect'));
    selectTool.addEventListener('click', () => setActiveTool('select'));
    fillTool.addEventListener('click', () => setActiveTool('fill'));

    // Dil butonlarını ayarla
    langEn.addEventListener('click', () => setLanguage('en'));
    langTr.addEventListener('click', () => setLanguage('tr'));

    // Sayfa yüklendiğinde dili ayarla
    setLanguage(currentLang);

    function setActiveTool(tool) {
        currentTool = tool;
        rectTool.classList.remove('active');
        selectTool.classList.remove('active');
        fillTool.classList.remove('active');

        if (tool === 'rect') {
            rectTool.classList.add('active');
            selectedShape = null;
            selectedCorner = null;
            updateLayerSelection();
        }
        else if (tool === 'select') selectTool.classList.add('active');
        else if (tool === 'fill') fillTool.classList.add('active');
        
        // Ayarları kaydet
        saveSettings();
    }

    // Opaklık değerini güncelle
    opacity.addEventListener('input', function() {
        if (opacityValue) {
            opacityValue.textContent = this.value;
        }
        if (selectedShape) {
            selectedShape.opacity = parseFloat(this.value);
            selectedShape.fillOpacity = parseFloat(this.value); // Dolgu opaklığını da güncelle
            redraw();
        }
    });

    // Dolgu rengini güncelle
    fillColor.addEventListener('input', function() {
        if (selectedShape) {
            selectedShape.fillColor = this.value;
            redraw();
        }
    });

    // Kenar rengini güncelle
    strokeColor.addEventListener('input', function() {
        if (selectedShape) {
            selectedShape.strokeColor = this.value;
            redraw();
        }
    });

    // Kenar stilini güncelle
    strokeStyle.addEventListener('change', function() {
        if (selectedShape) {
            selectedShape.strokeStyle = this.value;
            redraw();
        }
    });

    // Kenar kalınlığını güncelle
    strokeWidth.addEventListener('input', function() {
        if (strokeWidthValue) {
            strokeWidthValue.textContent = this.value;
        }
        if (selectedShape) {
            selectedShape.strokeWidth = parseInt(this.value);
            redraw();
        }
    });

    // Kenar opaklığını güncelle (eğer element varsa)
    if (strokeOpacity) {
        strokeOpacity.addEventListener('input', function() {
            if (strokeOpacityValue) {
                strokeOpacityValue.textContent = this.value;
            }
            if (selectedShape) {
                selectedShape.strokeOpacity = parseFloat(this.value);
                redraw();
            }
        });
    }

    // Dosya seçimini sadece resim formatlarıyla sınırla
    imageUpload.setAttribute('accept', 'image/png, image/jpeg, image/jpg, image/gif, image/webp');

    // Resim yükleme
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log("Dosya seçildi:", file.name, file.type);
            
            const reader = new FileReader();
            reader.onload = function(event) {
                console.log("Dosya yüklendi");
                
                const img = new Image();
                img.onload = function() {
                    console.log("Resim yüklendi:", img.width, "x", img.height);
                    originalImage = img;
                    resetCanvas();
                    downloadBtn.disabled = false;
                    
                    // Resim yüklendikten sonra kaydedilmiş şekilleri yükle
                    const savedShapes = localStorage.getItem('perspektifEditorShapes');
                    if (savedShapes) {
                        shapes = JSON.parse(savedShapes);
                        
                        // Katman listesini güncelle
                        layersContainer.innerHTML = '';
                        shapes.forEach(shape => {
                            addLayerItem(shape);
                        });
                        
                        redraw();
                    }
                };
                img.onerror = function(error) {
                    console.error("Resim yüklenirken hata:", error);
                };
                img.src = event.target.result;
            };
            reader.onerror = function(error) {
                console.error("Dosya okunurken hata:", error);
            };
            reader.readAsDataURL(file);
        }
    });

    // Canvas'ı sıfırla ve resmi ölçeklendir
    function resetCanvas() {
        if (!originalImage) return;

        console.log("Canvas sıfırlanıyor:", originalImage.width, "x", originalImage.height);

        // Canvas boyutunu ayarla
        const maxWidth = window.innerWidth - 320; // Sidebar genişliğini çıkar
        const maxHeight = window.innerHeight;
        
        let width = originalImage.width;
        let height = originalImage.height;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        imageCanvas.width = width;
        imageCanvas.height = height;
        
        // Canvas pozisyonunu ayarla
        canvasWrapper.style.width = width + 'px';
        canvasWrapper.style.height = height + 'px';
        
        // Resmi çiz
        ctx.drawImage(originalImage, 0, 0, width, height);
        
        // Zoom'u sıfırla
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        updateCanvasTransform();
        
        console.log("Canvas sıfırlama tamamlandı:", imageCanvas.width, "x", imageCanvas.height);
    }

    // Canvas olayları
    imageCanvas.addEventListener('mousedown', handleMouseDown);
    imageCanvas.addEventListener('mousemove', handleMouseMove);
    imageCanvas.addEventListener('mouseup', handleMouseUp);
    imageCanvas.addEventListener('mouseleave', handleMouseUp);

    function handleMouseDown(e) {
        const rect = imageCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        
        if (currentTool === 'rect') {
            isDrawing = true;
            currentShape = {
                type: 'rect',
                points: [
                    {x, y},
                    {x, y},
                    {x, y},
                    {x, y}
                ],
                strokeColor: strokeColor.value,
                fillColor: fillColor.value,
                strokeStyle: strokeStyle.value,
                strokeWidth: parseInt(strokeWidth.value),
                fillOpacity: parseFloat(opacity.value),
                strokeOpacity: strokeOpacity ? parseFloat(strokeOpacity.value) : 1,
                id: Date.now()
            };
        } else if (currentTool === 'select') {
            // Şekil seçimi veya köşe seçimi
            const result = hitTest(x, y);
            if (result.shape) {
                selectedShape = result.shape;
                selectedCorner = result.corner;
                dragStartX = x;
                dragStartY = y;
                isDrawing = true;
                updateLayerSelection();
                updatePropertiesPanel();
            } else {
                selectedShape = null;
                selectedCorner = null;
                updateLayerSelection();
            }
        } else if (currentTool === 'fill' && selectedShape) {
            selectedShape.fillColor = fillColor.value;
            redraw();
        }
    }

    function handleMouseMove(e) {
        if (!isDrawing) return;
        
        const rect = imageCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        
        if (currentTool === 'rect' && currentShape) {
            // Dikdörtgen çizimi
            currentShape.points[1].x = x;
            currentShape.points[1].y = currentShape.points[0].y;
            currentShape.points[2].x = x;
            currentShape.points[2].y = y;
            currentShape.points[3].x = currentShape.points[0].x;
            currentShape.points[3].y = y;
            redraw();
        } else if (currentTool === 'select' && selectedShape) {
            if (selectedCorner !== null) {
                // Köşe taşıma
                const dx = x - dragStartX;
                const dy = y - dragStartY;
                
                selectedShape.points[selectedCorner].x += dx;
                selectedShape.points[selectedCorner].y += dy;
            } else {
                // Tüm şekli taşıma
                const dx = x - dragStartX;
                const dy = y - dragStartY;
                
                // Tüm köşeleri taşı
                for (let i = 0; i < selectedShape.points.length; i++) {
                    selectedShape.points[i].x += dx;
                    selectedShape.points[i].y += dy;
                }
            }
            
            dragStartX = x;
            dragStartY = y;
            redraw();
        }
    }

    function handleMouseUp() {
        if (isDrawing && currentTool === 'rect' && currentShape) {
            shapes.push(currentShape);
            addLayerItem(currentShape);
            
            selectedShape = currentShape;
            selectedCorner = null;
            setActiveTool('select');
            updateLayerSelection();
            updatePropertiesPanel();
            
            currentShape = null;
        }
        isDrawing = false;
        redraw();
    }

    // Şekil veya köşe tıklaması testi
    function hitTest(x, y) {
        const result = { shape: null, corner: null, isInside: false };
        const hitDistance = 10 / scale; // Zoom seviyesine göre ayarla
        
        // Şekilleri sondan başa doğru kontrol et (üstteki şekiller önce)
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i];
            
            // Köşeleri kontrol et
            for (let j = 0; j < shape.points.length; j++) {
                const point = shape.points[j];
                const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
                
                if (distance < hitDistance) {
                    result.shape = shape;
                    result.corner = j;
                    return result;
                }
            }
            
            // Şeklin içini kontrol et
            if (isPointInShape(x, y, shape)) {
                result.shape = shape;
                result.isInside = true;
                return result;
            }
        }
        
        return result;
    }

    // Bir noktanın şeklin içinde olup olmadığını kontrol et
    function isPointInShape(x, y, shape) {
        const points = shape.points;
        let inside = false;
        
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            const intersect = ((yi > y) !== (yj > y)) && 
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                
            if (intersect) inside = !inside;
        }
        
        return inside;
    }

    // Canvas'ı yeniden çiz
    function redraw() {
        if (!originalImage) return;
        
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        ctx.drawImage(originalImage, 0, 0, imageCanvas.width, imageCanvas.height);
        
        // Tüm şekilleri çiz
        shapes.forEach(shape => drawShape(shape, shape === selectedShape));
        
        // Çizim sırasındaki şekli çiz
        if (currentShape) {
            drawShape(currentShape, true);
        }
    }

    // Şekil çizme
    function drawShape(shape, isSelected) {
        ctx.save();
        
        // Dolgu
        ctx.fillStyle = shape.fillColor;
        ctx.globalAlpha = shape.fillOpacity !== undefined ? shape.fillOpacity : (shape.opacity || 0.5);
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Kenar çizgisi
        ctx.strokeStyle = shape.strokeColor;
        ctx.globalAlpha = shape.strokeOpacity !== undefined ? shape.strokeOpacity : 1;
        if (shape.strokeStyle === 'dashed') {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }
        ctx.lineWidth = shape.strokeWidth || 2; // Varsayılan değer 2
        ctx.stroke();
        
        // Seçili ise köşeleri göster
        if (isSelected) {
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
            shape.points.forEach(point => {
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }
        
        ctx.restore();
    }

    // Katman öğesi ekle
    function addLayerItem(shape) {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.dataset.id = shape.id;
        
        const layerName = document.createElement('span');
        layerName.textContent = `${translations[currentLang].shape} ${shapes.indexOf(shape) + 1}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&#10006;';
        deleteBtn.title = 'Sil';
        deleteBtn.addEventListener('click', () => {
            shapes = shapes.filter(s => s.id !== shape.id);
            layersContainer.removeChild(layerItem);
            if (selectedShape === shape) {
                selectedShape = null;
            }
            redraw();
            saveSettings(); // Şekil silindiğinde kaydet
        });
        
        layerItem.appendChild(layerName);
        layerItem.appendChild(deleteBtn);
        
        layerItem.addEventListener('click', (e) => {
            if (e.target !== deleteBtn) {
                selectedShape = shape;
                selectedCorner = null;
                updateLayerSelection();
                updatePropertiesPanel();
                redraw();
            }
        });
        
        layersContainer.appendChild(layerItem);
        saveSettings(); // Şekil eklendiğinde kaydet
    }

    // Katman seçimini güncelle
    function updateLayerSelection() {
        const layerItems = layersContainer.querySelectorAll('.layer-item');
        layerItems.forEach(item => {
            item.classList.remove('selected');
            if (selectedShape && item.dataset.id == selectedShape.id) {
                item.classList.add('selected');
            }
        });
    }

    // Özellikler panelini güncelle
    function updatePropertiesPanel() {
        if (selectedShape) {
            strokeColor.value = selectedShape.strokeColor;
            fillColor.value = selectedShape.fillColor;
            strokeStyle.value = selectedShape.strokeStyle;
            
            // Dolgu opaklığı
            if (selectedShape.fillOpacity !== undefined) {
                opacity.value = selectedShape.fillOpacity;
                if (opacityValue) {
                    opacityValue.textContent = selectedShape.fillOpacity;
                }
            } else if (selectedShape.opacity !== undefined) {
                // Geriye dönük uyumluluk
                opacity.value = selectedShape.opacity;
                if (opacityValue) {
                    opacityValue.textContent = selectedShape.opacity;
                }
            } else {
                opacity.value = 0.5;
                if (opacityValue) {
                    opacityValue.textContent = 0.5;
                }
            }
            
            // Kenar opaklığı (eğer element varsa)
            if (strokeOpacity && strokeOpacityValue) {
                if (selectedShape.strokeOpacity !== undefined) {
                    strokeOpacity.value = selectedShape.strokeOpacity;
                    strokeOpacityValue.textContent = selectedShape.strokeOpacity;
                } else {
                    strokeOpacity.value = 1;
                    strokeOpacityValue.textContent = 1;
                }
            }
            
            // Kenar kalınlığını güncelle
            if (selectedShape.strokeWidth) {
                strokeWidth.value = selectedShape.strokeWidth;
                if (strokeWidthValue) {
                    strokeWidthValue.textContent = selectedShape.strokeWidth;
                }
            } else {
                strokeWidth.value = 2;
                if (strokeWidthValue) {
                    strokeWidthValue.textContent = 2;
                }
            }
        }
    }

    // Zoom işlemleri
    zoomIn.addEventListener('click', () => {
        scale *= 1.2;
        updateCanvasTransform();
        saveSettings();
    });
    
    zoomOut.addEventListener('click', () => {
        scale /= 1.2;
        updateCanvasTransform();
        saveSettings();
    });
    
    resetZoom.addEventListener('click', () => {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        updateCanvasTransform();
        saveSettings();
    });

    function updateCanvasTransform() {
        canvasWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    // Canvas'ı sürükleme
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') { // Boşluk tuşu
            imageCanvas.style.cursor = 'grab';
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
            imageCanvas.style.cursor = 'default';
            isPanning = false;
        }
    });

    imageCanvas.addEventListener('mousedown', (e) => {
        if (e.buttons === 2) { // Sağ tık
            e.preventDefault();
            isPanning = true;
            panStartX = e.clientX - offsetX;
            panStartY = e.clientY - offsetY;
            imageCanvas.style.cursor = 'grabbing';
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            offsetX = e.clientX - panStartX;
            offsetY = e.clientY - panStartY;
            updateCanvasTransform();
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            imageCanvas.style.cursor = 'default';
            saveSettings(); // Sürükleme bittiğinde pozisyonu kaydet
        }
    });

    // İndirme butonu
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) return;
        
        // Geçici canvas oluştur
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageCanvas.width;
        tempCanvas.height = imageCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Orijinal resmi çiz
        tempCtx.drawImage(originalImage, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Tüm şekilleri çiz
        shapes.forEach(shape => {
            tempCtx.save();
            tempCtx.globalAlpha = shape.opacity;
            
            // Dolgu
            tempCtx.fillStyle = shape.fillColor;
            tempCtx.beginPath();
            tempCtx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
                tempCtx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            tempCtx.closePath();
            tempCtx.fill();
            
            // Kenar çizgisi
            tempCtx.strokeStyle = shape.strokeColor;
            if (shape.strokeStyle === 'dashed') {
                tempCtx.setLineDash([5, 5]);
            } else {
                tempCtx.setLineDash([]);
            }
            tempCtx.lineWidth = shape.strokeWidth || 2;
            tempCtx.stroke();
            
            tempCtx.restore();
        });
        
        // Seçilen format
        const format = exportFormat.value;
        const quality = format === 'image/jpeg' ? 0.9 : 1.0;
        const extension = format === 'image/jpeg' ? 'jpg' : 'png';
        
        // İndirme bağlantısı oluştur
        const link = document.createElement('a');
        link.download = `perspektif-duzenleme.${extension}`;
        link.href = tempCanvas.toDataURL(format, quality);
        link.click();
    });

    // Pencere boyutu değiştiğinde canvas'ı yeniden boyutlandır
    window.addEventListener('resize', resetCanvas);

    // Tarayıcı dilini al
    function getBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('tr') ? 'tr' : 'en'; // Türkçe veya varsayılan olarak İngilizce
    }

    // Dili ayarla (saveSettings parametresi ekledik)
    function setLanguage(lang, saveToStorage = true) {
        currentLang = lang;
        
        // Dil butonlarını güncelle
        langEn.classList.remove('active');
        langTr.classList.remove('active');
        
        if (lang === 'en') langEn.classList.add('active');
        else if (lang === 'tr') langTr.classList.add('active');
        
        // Tüm çevrilebilir elementleri güncelle
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        
        // Select option'ları için özel işlem
        document.querySelectorAll('option[data-i18n]').forEach(option => {
            const key = option.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                option.textContent = translations[lang][key];
            }
        });
        
        // Katman isimlerini güncelle
        updateLayerNames();
        
        // Sayfa başlığını güncelle
        document.title = translations[lang].title;
        
        // Ayarları kaydet (isteğe bağlı)
        if (saveToStorage) {
            saveSettings();
        }
    }

    // Katman isimlerini güncelle
    function updateLayerNames() {
        const layerItems = layersContainer.querySelectorAll('.layer-item');
        layerItems.forEach((item, index) => {
            const nameSpan = item.querySelector('span');
            if (nameSpan) {
                nameSpan.textContent = `${translations[currentLang].shape} ${index + 1}`;
            }
        });
    }

    // Ayarları kaydet ve yükle fonksiyonları
    function saveSettings() {
        const settings = {
            strokeColor: strokeColor.value,
            fillColor: fillColor.value,
            strokeStyle: strokeStyle.value,
            fillOpacity: opacity.value,
            strokeOpacity: strokeOpacity ? strokeOpacity.value : 1,
            strokeWidth: strokeWidth.value,
            language: currentLang,
            exportFormat: exportFormat.value,
            currentTool: currentTool,
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY
        };
        localStorage.setItem('perspektifEditorSettings', JSON.stringify(settings));
        
        // Şekilleri ayrı olarak kaydet
        if (shapes.length > 0) {
            localStorage.setItem('perspektifEditorShapes', JSON.stringify(shapes));
        }
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('perspektifEditorSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Renk ve stil ayarlarını yükle
            strokeColor.value = settings.strokeColor || '#ff0000';
            fillColor.value = settings.fillColor || '#0000ff';
            strokeStyle.value = settings.strokeStyle || 'solid';
            
            // Opaklık ayarlarını yükle
            opacity.value = settings.fillOpacity || 0.5;
            if (opacityValue) {
                opacityValue.textContent = settings.fillOpacity || 0.5;
            }
            
            // Kenar opaklığı (eğer element varsa)
            if (strokeOpacity && strokeOpacityValue) {
                if (settings.strokeOpacity !== undefined) {
                    strokeOpacity.value = settings.strokeOpacity;
                    strokeOpacityValue.textContent = settings.strokeOpacity;
                } else {
                    strokeOpacity.value = 1;
                    strokeOpacityValue.textContent = 1;
                }
            }
            
            strokeWidth.value = settings.strokeWidth || 2;
            if (strokeWidthValue) {
                strokeWidthValue.textContent = settings.strokeWidth || 2;
            }
            
            exportFormat.value = settings.exportFormat || 'image/png';
            
            // Dil ayarını yükle
            if (settings.language) {
                currentLang = settings.language; // Önce dil değişkenini ayarla
                setLanguage(settings.language, false); // saveSettings çağrılmasın
            }
            
            // Araç seçimini yükle
            if (settings.currentTool) {
                setActiveTool(settings.currentTool);
            }
            
            // Zoom ve pozisyon ayarlarını yükle
            if (settings.scale) {
                scale = settings.scale;
                offsetX = settings.offsetX || 0;
                offsetY = settings.offsetY || 0;
                updateCanvasTransform();
            }
        }
        
        // Şekilleri yükle (eğer bir resim yüklenmişse)
        const savedShapes = localStorage.getItem('perspektifEditorShapes');
        if (savedShapes && originalImage) {
            shapes = JSON.parse(savedShapes);
            
            // Katman listesini güncelle
            layersContainer.innerHTML = '';
            shapes.forEach(shape => {
                addLayerItem(shape);
            });
            
            redraw();
        }
    }

    // Ayarları değiştirdiğimizde kaydet
    strokeColor.addEventListener('change', saveSettings);
    fillColor.addEventListener('change', saveSettings);
    strokeStyle.addEventListener('change', saveSettings);
    opacity.addEventListener('change', saveSettings);
    if (strokeOpacity) {
        strokeOpacity.addEventListener('change', saveSettings);
    }
    strokeWidth.addEventListener('change', saveSettings);
    exportFormat.addEventListener('change', saveSettings);

    // Sayfa yüklendiğinde ayarları yükle
    loadSettings();
}); 