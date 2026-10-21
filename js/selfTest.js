// ============================================
// selfTest.js — Система самотестирования редактора
// Проверяет критические элементы при запуске
// ============================================

const SelfTest = {
  
  tests: [],
  results: {
    passed: 0,
    failed: 0,
    warnings: 0
  },

  /**
   * Запуск всех тестов
   */
  async runAll() {
    console.log('🧪 Запуск самотестирования редактора...');
    this.results = { passed: 0, failed: 0, warnings: 0 };
    this.tests = [];
    
    // Критические тесты
    this.testCoreModule();
    this.testPoetryEditor();
    this.testMediaEditor();
    this.testTranslationManager();
    this.testModals();
    this.testButtons();
    this.testForms();
    
    // Генерируем отчет
    this.generateReport();
    
    return this.results;
  },

  /**
   * Тест: Core модуль загружен
   */
  testCoreModule() {
    if (typeof Editor === 'undefined') {
      this.fail('Core', 'Editor не определен');
      return;
    }
    
    if (!Editor.data) {
      this.fail('Core', 'Editor.data не инициализирован');
      return;
    }
    
    if (typeof Editor.loadFromFile !== 'function') {
      this.fail('Core', 'Editor.loadFromFile не является функцией');
      return;
    }
    
    this.pass('Core', 'Модуль загружен и инициализирован');
  },

  /**
   * Тест: PoetryEditor
   */
  testPoetryEditor() {
    if (typeof PoetryEditor === 'undefined') {
      this.fail('PoetryEditor', 'Модуль не загружен');
      return;
    }
    
    if (typeof PoetryEditor.openForm !== 'function') {
      this.fail('PoetryEditor', 'openForm не является функцией');
      return;
    }
    
    if (typeof PoetryEditor.savePoem !== 'function') {
      this.fail('PoetryEditor', 'savePoem не является функцией');
      return;
    }
    
    this.pass('PoetryEditor', 'Модуль работает корректно');
  },

  /**
   * Тест: MediaEditor
   */
  testMediaEditor() {
    if (typeof MediaEditor === 'undefined') {
      this.fail('MediaEditor', 'Модуль не загружен');
      return;
    }
    
    if (typeof MediaEditor.openForm !== 'function') {
      this.fail('MediaEditor', 'openForm не является функцией');
      return;
    }
    
    if (typeof MediaEditor.saveMedia !== 'function') {
      this.fail('MediaEditor', 'saveMedia не является функцией');
      return;
    }
    
    this.pass('MediaEditor', 'Модуль работает корректно');
  },

  /**
   * Тест: TranslationManager
   */
  testTranslationManager() {
    if (typeof TranslationManager === 'undefined') {
      this.warn('TranslationManager', 'Модуль не загружен (опционально)');
      return;
    }
    
    if (typeof TranslationManager.syncBackLinks !== 'function') {
      this.fail('TranslationManager', 'syncBackLinks не является функцией');
      return;
    }
    
    this.pass('TranslationManager', 'Модуль работает корректно');
  },

  /**
   * Тест: Модальные окна
   */
  testModals() {
    const poetryModal = document.getElementById('poetryEditorCard');
    const mediaModal = document.getElementById('mediaEditorCard');
    
    if (!poetryModal) {
      this.fail('Modals', 'poetryEditorCard не найден в DOM');
      return;
    }
    
    if (!mediaModal) {
      this.fail('Modals', 'mediaEditorCard не найден в DOM');
      return;
    }
    
    // Проверяем, что модалки скрыты по умолчанию
    if (poetryModal.classList.contains('hidden') && mediaModal.classList.contains('hidden')) {
      this.pass('Modals', 'Модальные окна присутствуют и скрыты');
    } else {
      this.warn('Modals', 'Модальные окна не скрыты по умолчанию');
    }
  },

  /**
   * Тест: Кнопки в модальных окнах
   */
  testButtons() {
    const tests = [
      { id: 'p-title', name: 'Поле заголовка стиха' },
      { id: 'p-text', name: 'Поле текста стиха' },
      { id: 'p-youtube', name: 'Поле YouTube ID стиха' },
      { id: 'm-title', name: 'Поле названия медиа' },
      { id: 'm-youtube', name: 'Поле YouTube ID медиа' },
      { id: 'm-audio', name: 'Поле аудио медиа' }
    ];
    
    let missingFields = [];
    
    tests.forEach(test => {
      const el = document.getElementById(test.id);
      if (!el) {
        missingFields.push(test.name);
      }
    });
    
    if (missingFields.length === 0) {
      this.pass('Form Fields', 'Все критические поля присутствуют');
    } else {
      this.fail('Form Fields', `Отсутствуют поля: ${missingFields.join(', ')}`);
    }
  },

  /**
   * Тест: Формы редактирования
   */
  testForms() {
    // Пробуем открыть форму поэзии
    try {
      if (typeof PoetryEditor !== 'undefined' && typeof PoetryEditor.openForm === 'function') {
        // Не вызываем, просто проверяем наличие
        this.pass('Poetry Form', 'Форма редактирования стихов доступна');
      } else {
        this.fail('Poetry Form', 'openForm недоступна');
      }
    } catch (e) {
      this.fail('Poetry Form', `Ошибка: ${e.message}`);
    }
    
    // Пробуем открыть форму медиа
    try {
      if (typeof MediaEditor !== 'undefined' && typeof MediaEditor.openForm === 'function') {
        this.pass('Media Form', 'Форма редактирования медиа доступна');
      } else {
        this.fail('Media Form', 'openForm недоступна');
      }
    } catch (e) {
      this.fail('Media Form', `Ошибка: ${e.message}`);
    }
  },

  /**
   * Методы для записи результатов
   */
  pass(category, message) {
    this.tests.push({ 
      status: 'pass', 
      category, 
      message,
      icon: '✅'
    });
    this.results.passed++;
    console.log(`✅ [${category}] ${message}`);
  },

  fail(category, message) {
    this.tests.push({ 
      status: 'fail', 
      category, 
      message,
      icon: '❌'
    });
    this.results.failed++;
    console.error(`❌ [${category}] ${message}`);
  },

  warn(category, message) {
    this.tests.push({ 
      status: 'warn', 
      category, 
      message,
      icon: '⚠️'
    });
    this.results.warnings++;
    console.warn(`⚠️ [${category}] ${message}`);
  },

  /**
   * Генерация отчета
   */
  generateReport() {
    const total = this.results.passed + this.results.failed + this.results.warnings;
    
    let report = '\n╔═══════════════════════════════════════════╗\n';
    report += '║   ОТЧЁТ САМОТЕСТИРОВАНИЯ РЕДАКТОРА       ║\n';
    report += '╚═══════════════════════════════════════════╝\n\n';
    
    report += `📊 Всего тестов: ${total}\n`;
    report += `✅ Успешно: ${this.results.passed}\n`;
    report += `❌ Провалено: ${this.results.failed}\n`;
    report += `⚠️  Предупреждений: ${this.results.warnings}\n\n`;
    
    if (this.results.failed > 0) {
      report += '═══ КРИТИЧЕСКИЕ ОШИБКИ ═══\n';
      this.tests.filter(t => t.status === 'fail').forEach(test => {
        report += `${test.icon} [${test.category}] ${test.message}\n`;
      });
      report += '\n';
    }
    
    if (this.results.warnings > 0) {
      report += '═══ ПРЕДУПРЕЖДЕНИЯ ═══\n';
      this.tests.filter(t => t.status === 'warn').forEach(test => {
        report += `${test.icon} [${test.category}] ${test.message}\n`;
      });
      report += '\n';
    }
    
    if (this.results.failed === 0) {
      report += '🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!\n';
      report += '   Редактор готов к работе.\n';
    } else {
      report += '⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ!\n';
      report += `   Исправьте ${this.results.failed} критических ошибок.\n`;
    }
    
    report += '\n╚═══════════════════════════════════════════╝';
    
    console.log(report);
    
    // Показываем результат в UI
    if (this.results.failed > 0) {
      this.showResultInUI(report, 'error');
    } else if (this.results.warnings > 0) {
      this.showResultInUI(report, 'warning');
    } else {
      console.log('✅ Самотестирование завершено успешно');
    }
    
    return report;
  },

  /**
   * Показывает результат тестов в UI
   */
  showResultInUI(report, type = 'info') {
    // Создаём элемент для отображения результатов
    const existingAlert = document.getElementById('selfTestAlert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.id = 'selfTestAlert';
    alertDiv.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      max-width: 400px;
      font-family: monospace;
      font-size: 12px;
      cursor: pointer;
    `;
    
    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    const title = type === 'error' ? 'Обнаружены ошибки!' : type === 'warning' ? 'Предупреждения' : 'Всё в порядке';
    
    alertDiv.innerHTML = `
      <strong>${icon} ${title}</strong><br>
      <small>Нажмите для просмотра отчёта</small>
    `;
    
    alertDiv.onclick = () => {
      alert(report);
      alertDiv.remove();
    };
    
    document.body.appendChild(alertDiv);
    
    // Автоматически скрываем через 10 секунд
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => alertDiv.remove(), 500);
      }
    }, 10000);
  },

  /**
   * Быстрый тест (только критические проверки)
   */
  quickTest() {
    console.log('⚡ Быстрое самотестирование...');
    
    const critical = [
      { check: () => typeof Editor !== 'undefined', name: 'Editor' },
      { check: () => typeof PoetryEditor !== 'undefined', name: 'PoetryEditor' },
      { check: () => typeof MediaEditor !== 'undefined', name: 'MediaEditor' },
      { check: () => document.getElementById('poetryEditorCard'), name: 'Poetry Modal' },
      { check: () => document.getElementById('mediaEditorCard'), name: 'Media Modal' }
    ];
    
    const failed = critical.filter(test => !test.check());
    
    if (failed.length === 0) {
      console.log('✅ Быстрая проверка пройдена');
      return true;
    } else {
      console.error(`❌ Быстрая проверка провалена: ${failed.map(t => t.name).join(', ')}`);
      return false;
    }
  }
};

// Автоматический запуск при загрузке страницы
window.addEventListener('load', () => {
  setTimeout(() => {
    SelfTest.runAll();
  }, 1000); // Задержка 1 секунда чтобы все модули успели загрузиться
});

console.log('✅ SelfTest загружен');