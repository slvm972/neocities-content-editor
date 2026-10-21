// ============================================
// core.js — Основной модуль редактора
// + АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ЧАНКОВ при сохранении
// ============================================

const Editor = {
  data: null,
  isDirty: false,
  formIsOpen: false,
  currentTab: 'poetry',
  
  init() {
    console.log('🚀 Инициализация редактора...');
    
    this.data = {
      version: 0,
      poetry: [],
      news: [],
      tracks: [],
      videos: [],
      intentional_duplicates: []
    };
    
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        e.preventDefault();
        e.returnValue = 'У вас есть несохраненные изменения. Вы уверены?';
        return e.returnValue;
      }
    });
    
    this.renderAll();
    console.log('✅ Редактор инициализирован');
  },

  loadFromFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        
        if (!json.poetry || !Array.isArray(json.poetry)) {
          throw new Error('Некорректная структура JSON: отсутствует массив poetry');
        }
        
        // Нормализуем структуру translations
        json.poetry.forEach(poem => {
          if (Array.isArray(poem.translations)) {
            poem.translations = poem.translations.map(item => {
              if (typeof item === 'object' && item !== null && item.poem_id) {
                return item.poem_id;
              }
              return item;
            }).filter(Boolean);
          } else {
            poem.translations = [];
          }
        });
        
        this.data = json;
        
        if (!this.data.news) this.data.news = [];
        if (!this.data.tracks) this.data.tracks = [];
        if (!this.data.videos) this.data.videos = [];
        if (!this.data.intentional_duplicates) this.data.intentional_duplicates = [];
        
        if (typeof this.data.version !== 'number') {
          this.data.version = 0;
        }
        
        this.isDirty = false;
        
        document.getElementById('fileStatus').textContent = `✅ ${file.name}`;
        document.getElementById('versionDisplay').textContent = this.data.version;
        document.getElementById('globalSaveBtn').disabled = false;
        
        console.log(`✅ Загружено: ${this.data.poetry.length} стихов, версия ${this.data.version}`);
        
        if (typeof TranslationManager !== 'undefined') {
          setTimeout(() => {
            console.log('🔧 Автоматическая нормализация связей после загрузки...');
            const issues = TranslationManager.normalizeAllTranslations();
            
            if (issues.length > 0) {
              console.log(`⚠️ При нормализации исправлено проблем: ${issues.length}`);
            }
            
            this.renderAll();
          }, 100);
        } else {
          this.renderAll();
        }
        
      } catch (error) {
        alert(`Ошибка при загрузке файла: ${error.message}`);
        console.error('Ошибка загрузки:', error);
      }
    };

    reader.readAsText(file);
  },

  /**
   * ✅ НОВОЕ: Сохранение с автоматическим созданием чанков
   */
  downloadFile() {
    if (!this.data) {
      alert('Нет данных для сохранения');
      return;
    }

    this.data.version = (this.data.version || 0) + 1;
    
    if (typeof TranslationManager !== 'undefined') {
      console.log('🔧 Финальная нормализация перед сохранением...');
      const issues = TranslationManager.normalizeAllTranslations();
      
      if (issues.length > 0) {
        console.log(`⚠️ Исправлено проблем: ${issues.length}`);
      }
    }

    const exportData = JSON.parse(JSON.stringify(this.data));
    
    exportData.poetry.forEach(p => {
      if (Array.isArray(p.translations)) {
        p.translations = p.translations.map(id => {
          const targetPoem = exportData.poetry.find(poem => poem.id === id);
          return {
            poem_id: id,
            lang: targetPoem ? targetPoem.lang : 'unknown'
          };
        });
      }
    });

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `poetry-data-v${this.data.version}-${timestamp}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.isDirty = false;
    document.getElementById('versionDisplay').textContent = this.data.version;
    
    console.log(`💾 Сохранено: ${filename}`);
    
    // ✅ НОВОЕ: Предлагаем создать чанки
    setTimeout(() => {
      if (confirm('✅ Файл сохранён!\n\n📦 Создать оптимизированные чанки для сайта?\n(Рекомендуется для улучшения производительности)')) {
        this.generateChunks();
      }
    }, 500);
  },

  /**
   * ✅ НОВОЕ: Генерация чанков в браузере
   */
  generateChunks() {
    console.log('📦 Генерация чанков...');
    console.time('📦 Chunk generation');
    
    try {
      const chunks = this._splitDataIntoChunks();
      
      // Создаём ZIP-архив с чанками
      this._downloadChunksAsZip(chunks);
      
      console.timeEnd('📦 Chunk generation');
      
      alert(`✅ Создано ${chunks.poetryChunks.length} чанков!\n\nСкачан архив data.zip.\nРаспакуйте его в корень сайта.`);
      
    } catch (error) {
      console.error('❌ Ошибка генерации чанков:', error);
      alert('Ошибка создания чанков: ' + error.message);
    }
  },

  /**
   * Разбиение данных на чанки
   */
  _splitDataIntoChunks() {
    const CHUNK_SIZE = 50;
    
    // 1. meta.json
    const meta = {
      version: this.data.version,
      total_poems: this.data.poetry.length,
      total_news: this.data.news.length,
      total_tracks: this.data.tracks.length,
      total_videos: this.data.videos.length,
      generated_at: new Date().toISOString()
    };
    
    // 2. news.json
    const news = this.data.news;
    
    // 3. media.json
    const media = {
      tracks: this.data.tracks,
      videos: this.data.videos
    };
    
    // 4. Разбиение poetry на чанки по языкам
    const byLang = {};
    this.data.poetry.forEach(poem => {
      const lang = poem.lang || 'ru';
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push(poem);
    });
    
    const poetryChunks = [];
    const index = [];
    
    Object.entries(byLang).forEach(([lang, poems]) => {
      // Сортируем по дате
      poems.sort((a, b) => {
        if (!a.date_published) return 1;
        if (!b.date_published) return -1;
        return new Date(b.date_published) - new Date(a.date_published);
      });
      
      // Разбиваем на чанки по 50 стихов
      for (let i = 0; i < poems.length; i += CHUNK_SIZE) {
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
        const chunkName = `${lang}-${chunkNum}`;
        const chunkPoems = poems.slice(i, i + CHUNK_SIZE);
        
        poetryChunks.push({
          name: chunkName,
          data: chunkPoems
        });
        
        // Добавляем в индекс
        chunkPoems.forEach(poem => {
          index.push({
            id: poem.id,
            title: poem.title,
            lang: poem.lang,
            collection: poem.collection || '',
            date_published: poem.date_published || '',
            translations: poem.translations || [],
            audio: poem.audio || '',
            youtubeId: poem.youtubeId || '',
            slug: poem.slug || '',
            chunk: chunkName
          });
        });
      }
    });
    
    console.log(`📦 Создано чанков: ${poetryChunks.length}`);
    console.log(`📋 Индекс: ${index.length} записей`);
    
    return {
      meta,
      news,
      media,
      index,
      poetryChunks
    };
  },

  /**
   * Скачивание чанков как ZIP-архив
   * (используем JSZip если доступен, иначе — отдельные файлы)
   */
  async _downloadChunksAsZip(chunks) {
    // Проверяем наличие JSZip
    if (typeof JSZip === 'undefined') {
      alert('⚠️ Библиотека JSZip не загружена.\n\nФайлы будут скачаны по отдельности.\n(Добавьте <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script> в editor.html)');
      this._downloadChunksSeparately(chunks);
      return;
    }
    
    const zip = new JSZip();
    
    // Создаём структуру папок
    zip.file('meta.json', JSON.stringify(chunks.meta, null, 2));
    zip.file('news.json', JSON.stringify(chunks.news, null, 2));
    zip.file('media.json', JSON.stringify(chunks.media, null, 2));
    zip.file('poetry-index.json', JSON.stringify(chunks.index, null, 2));
    
    const chunksFolder = zip.folder('poetry-chunks');
    chunks.poetryChunks.forEach(chunk => {
      chunksFolder.file(`${chunk.name}.json`, JSON.stringify(chunk.data, null, 2));
    });
    
    // Генерируем ZIP
    const blob = await zip.generateAsync({ type: 'blob' });
    
    // Скачиваем
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.zip';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ ZIP-архив создан и скачан');
  },

  /**
   * Fallback: скачивание файлов по отдельности
   */
  _downloadChunksSeparately(chunks) {
    const download = (filename, data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    download('meta.json', chunks.meta);
    download('news.json', chunks.news);
    download('media.json', chunks.media);
    download('poetry-index.json', chunks.index);
    
    chunks.poetryChunks.forEach(chunk => {
      download(`poetry-chunk-${chunk.name}.json`, chunk.data);
    });
    
    alert(`✅ Скачано ${4 + chunks.poetryChunks.length} файлов.\n\nСоздайте структуру:\ndata/\n  meta.json\n  news.json\n  media.json\n  poetry-index.json\n  poetry-chunks/\n    ru-1.json\n    ru-2.json\n    ...`);
  },

  setTab(tabName, event) {
    const poetryForm = document.getElementById('poetryEditorCard');
    const mediaForm = document.getElementById('mediaEditorCard');
    
    const poetryFormOpen = poetryForm && poetryForm.style.display !== 'none';
    const mediaFormOpen = mediaForm && mediaForm.style.display !== 'none';
    
    if ((poetryFormOpen || mediaFormOpen) && this.isDirty) {
      if (!confirm('У вас открыта форма редактирования. Закрыть без сохранения?')) {
        return;
      }
      
      if (poetryForm) poetryForm.style.display = 'none';
      if (mediaForm) mediaForm.style.display = 'none';
      this.formIsOpen = false;
    }
    
    this.currentTab = tabName;
    
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    
    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    if (event && event.target) {
      event.target.classList.add('active');
    }
    
    this.renderTabContent(tabName);
  },

  renderTabContent(tabName) {
    switch(tabName) {
      case 'poetry':
        if (typeof PoetryEditor !== 'undefined') {
          PoetryEditor.renderCollections();
          PoetryEditor.renderList();
        }
        break;
      
      case 'collections':
        if (typeof CollectionManager !== 'undefined') {
          CollectionManager.render();
        }
        break;
      
      case 'news':
        if (typeof NewsEditor !== 'undefined') {
          NewsEditor.render();
        }
        break;
      
      case 'media':
        if (typeof MediaEditor !== 'undefined') {
          MediaEditor.render();
        }
        break;
      
      case 'duplicates':
        if (typeof DuplicateDetector !== 'undefined') {
          DuplicateDetector.render();
        }
        break;
    }
  },

  renderAll() {
    if (!this.data) return;
    this.renderTabContent(this.currentTab);
  },

  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  generateReport() {
    if (!this.data) {
      alert('Данные не загружены');
      return;
    }

    const stats = {
      version: this.data.version,
      totalPoems: this.data.poetry.length,
      totalNews: this.data.news.length,
      totalTracks: (this.data.tracks || []).length,
      totalVideos: (this.data.videos || []).length,
      poemsWithSlug: this.data.poetry.filter(p => p.slug).length,
      poemsWithTranslations: this.data.poetry.filter(p => p.translations && p.translations.length > 0).length
    };

    let report = '=== ОТЧЕТ О ДАННЫХ ===\n\n';
    report += `Версия: ${stats.version}\n`;
    report += `Всего стихов: ${stats.totalPoems}\n`;
    report += `  - Со slug: ${stats.poemsWithSlug}\n`;
    report += `  - С переводами: ${stats.poemsWithTranslations}\n`;
    report += `Новостей: ${stats.totalNews}\n`;
    report += `Музыки: ${stats.totalTracks}\n`;
    report += `Видео: ${stats.totalVideos}\n`;

    if (typeof TranslationManager !== 'undefined') {
      const tranStats = TranslationManager.getStatistics();
      report += `\n=== ПЕРЕВОДЫ ===\n`;
      report += `Групп переводов: ${tranStats.translationGroups}\n`;
      report += `Всего связей: ${tranStats.totalLinks}\n`;
      report += `Средний размер группы: ${tranStats.averageGroupSize}\n`;
      report += `Максимальная группа: ${tranStats.largestGroup} стихов\n`;
    }

    console.log(report);
    alert(report);
  },

  reset() {
    if (!confirm('Очистить все данные? Это действие нельзя отменить!')) {
      return;
    }

    this.data = {
      version: 0,
      poetry: [],
      news: [],
      tracks: [],
      videos: [],
      intentional_duplicates: []
    };

    this.isDirty = false;
    this.formIsOpen = false;

    document.getElementById('fileStatus').textContent = 'Файл не выбран';
    document.getElementById('versionDisplay').textContent = '0';
    document.getElementById('globalSaveBtn').disabled = true;

    this.renderAll();
    console.log('🗑️ Данные очищены');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Editor;
}

console.log('✅ Core загружен (с поддержкой чанков)');