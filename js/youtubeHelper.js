// ============================================
// youtubeHelper.js — Утилиты для работы с YouTube
// CHROME-СОВМЕСТИМАЯ ВЕРСИЯ
// ============================================

const YouTubeHelper = {
  
  /**
   * Извлекает YouTube ID из различных форматов ссылок
   * @param {string} input - URL или ID
   * @returns {string|null} - Чистый YouTube ID или null
   */
  extractId(input) {
    if (!input) return null;
    
    const trimmed = input.trim();
    
    // Уже чистый ID (11 символов)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Различные форматы YouTube ссылок
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  },

  /**
   * Валидация YouTube ID
   * @param {string} id - YouTube ID
   * @returns {boolean}
   */
  isValid(id) {
    if (!id) return false;
    return /^[a-zA-Z0-9_-]{11}$/.test(id);
  },

  /**
   * Создаёт embed URL с оптимальными параметрами для Chrome
   * @param {string} videoId - YouTube ID
   * @param {Object} options - Опции для iframe
   * @returns {string} - Полный embed URL
   */
  buildEmbedUrl(videoId, options = {}) {
    const {
      autoplay = false,      // Автовоспроизведение (для Chrome лучше false по умолчанию)
      controls = true,       // Показывать элементы управления
      mute = false,          // Без звука (для autoplay в Chrome часто требуется)
      loop = false,          // Зацикливание
      modestbranding = true, // Убрать лого YouTube
      rel = false,           // Не показывать похожие видео
      start = 0,             // Начать с определённой секунды
      enablejsapi = true     // Включить JS API
    } = options;

    const params = new URLSearchParams({
      // КРИТИЧНО для Chrome: эти параметры помогают обойти блокировки
      origin: window.location.origin,
      enablejsapi: enablejsapi ? '1' : '0',
      
      // Стандартные параметры
      autoplay: autoplay ? '1' : '0',
      controls: controls ? '1' : '0',
      mute: mute ? '1' : '0',
      loop: loop ? '1' : '0',
      modestbranding: modestbranding ? '1' : '0',
      rel: rel ? '1' : '0',
      playsinline: '1', // Важно для мобильных устройств
      
      // Дополнительные параметры для улучшения совместимости
      iv_load_policy: '3', // Убрать аннотации
      fs: '1', // Разрешить полноэкранный режим
      disablekb: '0' // Разрешить управление клавиатурой
    });

    if (start > 0) {
      params.append('start', start.toString());
    }

    if (loop) {
      // Для зацикливания нужно передать playlist=ID
      params.append('playlist', videoId);
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  },

  /**
   * Создаёт iframe элемент для YouTube видео (Chrome-совместимый)
   * @param {string} videoId - YouTube ID
   * @param {Object} options - Опции
   * @returns {HTMLIFrameElement} - Готовый iframe элемент
   */
  createIframe(videoId, options = {}) {
    const {
      width = '100%',
      height = '100%',
      aspectRatio = '16/9', // '16/9' или '9/16'
      autoplay = false,
      title = 'YouTube video player'
    } = options;

    const iframe = document.createElement('iframe');
    
    // Базовые атрибуты
    iframe.src = this.buildEmbedUrl(videoId, options);
    iframe.width = width;
    iframe.height = height;
    iframe.title = title;
    iframe.frameBorder = '0';
    
    // КРИТИЧНО для Chrome: эти атрибуты обязательны
    iframe.setAttribute('allow', [
      'accelerometer',
      'autoplay',
      'clipboard-write',
      'encrypted-media',
      'gyroscope',
      'picture-in-picture',
      'web-share'
    ].join('; '));
    
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy'); // Ленивая загрузка для производительности
    
    // Дополнительные атрибуты безопасности для Chrome
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    iframe.setAttribute('sandbox', [
      'allow-scripts',
      'allow-same-origin',
      'allow-presentation',
      'allow-forms'
    ].join(' '));

    // Стили для адаптивности
    iframe.style.cssText = `
      width: ${width};
      height: ${height};
      aspect-ratio: ${aspectRatio};
      border: none;
      border-radius: 8px;
    `;

    return iframe;
  },

  /**
   * Получить превью изображение для видео
   * @param {string} videoId - YouTube ID
   * @param {string} quality - Качество: 'default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault'
   * @returns {string} - URL превью
   */
  getThumbnail(videoId, quality = 'mqdefault') {
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  },

  /**
   * Проверка доступности видео (async)
   * @param {string} videoId - YouTube ID
   * @returns {Promise<boolean>}
   */
  async checkAvailability(videoId) {
    try {
      const response = await fetch(this.getThumbnail(videoId, 'default'), {
        method: 'HEAD'
      });
      return response.ok;
    } catch (error) {
      console.warn(`⚠️ Не удалось проверить доступность видео ${videoId}:`, error);
      return false;
    }
  },

  /**
   * Создаёт контейнер для responsive видео
   * @param {string} videoId - YouTube ID
   * @param {Object} options - Опции
   * @returns {HTMLDivElement} - Контейнер с iframe внутри
   */
  createResponsiveContainer(videoId, options = {}) {
    const {
      aspectRatio = '16/9', // '16/9' или '9/16'
      maxWidth = null,
      className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `youtube-container ${className}`.trim();
    
    // Определяем padding-bottom для aspect ratio
    const paddingBottom = aspectRatio === '9/16' ? '177.78%' : '56.25%';
    
    container.style.cssText = `
      position: relative;
      width: 100%;
      ${maxWidth ? `max-width: ${maxWidth};` : ''}
      padding-bottom: ${paddingBottom};
      margin: 0 auto;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    `;

    const iframe = this.createIframe(videoId, { 
      ...options,
      width: '100%',
      height: '100%'
    });
    
    iframe.style.cssText += `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;

    container.appendChild(iframe);
    return container;
  },

  /**
   * Создаёт превью с кнопкой воспроизведения
   * @param {string} videoId - YouTube ID
   * @param {Object} options - Опции
   * @returns {HTMLDivElement} - Контейнер с превью
   */
  createThumbnailWithPlay(videoId, options = {}) {
    const {
      aspectRatio = '16/9',
      maxWidth = null,
      onPlay = null,
      title = ''
    } = options;

    const container = document.createElement('div');
    container.className = 'youtube-thumbnail-container';
    
    const paddingBottom = aspectRatio === '9/16' ? '177.78%' : '56.25%';
    
    container.style.cssText = `
      position: relative;
      width: 100%;
      ${maxWidth ? `max-width: ${maxWidth};` : ''}
      padding-bottom: ${paddingBottom};
      margin: 0 auto;
      background: url('${this.getThumbnail(videoId, 'hqdefault')}') center/cover;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.2s;
    `;

    // Кнопка воспроизведения
    const playButton = document.createElement('div');
    playButton.innerHTML = '▶';
    playButton.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 68px;
      height: 48px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border-radius: 12px;
      transition: all 0.3s;
      pointer-events: none;
    `;

    container.appendChild(playButton);

    // Обработчик клика
    container.addEventListener('click', () => {
      if (onPlay) {
        onPlay(videoId);
      } else {
        // По умолчанию заменяем превью на iframe
        const iframe = this.createResponsiveContainer(videoId, { 
          ...options, 
          autoplay: true 
        });
        container.replaceWith(iframe);
      }
    });

    // Hover эффект
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'scale(1.02)';
      playButton.style.background = 'rgba(255, 0, 0, 1)';
    });

    container.addEventListener('mouseleave', () => {
      container.style.transform = 'scale(1)';
      playButton.style.background = 'rgba(255, 0, 0, 0.8)';
    });

    return container;
  },

  /**
   * Диагностика проблем с YouTube в Chrome
   * @returns {Object} - Отчёт о возможных проблемах
   */
  diagnoseChrome() {
    const report = {
      browser: this.detectBrowser(),
      issues: [],
      recommendations: []
    };

    // Проверка HTTPS
    if (window.location.protocol !== 'https:') {
      report.issues.push('Сайт работает по HTTP, а не HTTPS');
      report.recommendations.push('Переход на HTTPS улучшит совместимость с YouTube');
    }

    // Проверка localStorage (для настроек плеера)
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (e) {
      report.issues.push('localStorage недоступен');
      report.recommendations.push('Разрешите cookie и хранилище данных');
    }

    // Проверка Third-Party Cookies
    if (navigator.cookieEnabled === false) {
      report.issues.push('Cookies отключены');
      report.recommendations.push('Включите cookies в настройках браузера');
    }

    // Проверка Content Security Policy
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (metaCSP) {
      const csp = metaCSP.getAttribute('content');
      if (!csp.includes('youtube.com') && !csp.includes('youtube-nocookie.com')) {
        report.issues.push('CSP не разрешает YouTube');
        report.recommendations.push('Добавьте youtube.com и youtube-nocookie.com в CSP');
      }
    }

    return report;
  },

  /**
   * Определение браузера
   * @returns {string} - Название браузера
   */
  detectBrowser() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    
    return 'Unknown';
  },

  /**
   * Тестирование воспроизведения YouTube
   * @param {string} videoId - YouTube ID
   * @returns {Promise<Object>} - Результат теста
   */
  async testPlayback(videoId) {
    console.log('🧪 Тестирование воспроизведения YouTube...');
    
    const testContainer = document.createElement('div');
    testContainer.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 560px; height: 315px;';
    document.body.appendChild(testContainer);

    const iframe = this.createIframe(videoId, { autoplay: false });
    testContainer.appendChild(iframe);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        document.body.removeChild(testContainer);
        resolve({
          success: false,
          error: 'Timeout: видео не загрузилось за 5 секунд',
          recommendations: [
            'Проверьте интернет-соединение',
            'Убедитесь, что YouTube не заблокирован',
            'Попробуйте другой браузер'
          ]
        });
      }, 5000);

      iframe.addEventListener('load', () => {
        clearTimeout(timeout);
        document.body.removeChild(testContainer);
        resolve({
          success: true,
          message: 'YouTube iframe успешно загружен'
        });
      });

      iframe.addEventListener('error', (e) => {
        clearTimeout(timeout);
        document.body.removeChild(testContainer);
        resolve({
          success: false,
          error: e.message || 'Ошибка загрузки iframe',
          recommendations: [
            'Проверьте настройки безопасности браузера',
            'Отключите блокировщики рекламы',
            'Проверьте Content Security Policy'
          ]
        });
      });
    });
  }
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = YouTubeHelper;
}

// Глобальная функция для обратной совместимости
window.extractYouTubeId = (input) => YouTubeHelper.extractId(input);
window.isValidYouTubeId = (id) => YouTubeHelper.isValid(id);

console.log('✅ YouTubeHelper (Chrome-совместимая версия) загружен');

// Автоматическая диагностика при загрузке (только в dev режиме)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(() => {
    const diagnosis = YouTubeHelper.diagnoseChrome();
    console.log('🔍 Диагностика YouTube в Chrome:', diagnosis);
    
    if (diagnosis.issues.length > 0) {
      console.warn('⚠️ Обнаружены потенциальные проблемы:');
      diagnosis.issues.forEach(issue => console.warn(`  • ${issue}`));
      console.log('💡 Рекомендации:');
      diagnosis.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }, 1000);
}