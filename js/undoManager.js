// ============================================
// undoManager.js — Система отмены/повтора действий
// Undo/Redo для редактора стихов
// ============================================

const UndoManager = {
  
  undoStack: [],
  redoStack: [],
  maxStackSize: 50, // Максимум 50 действий в истории
  isApplyingChange: false, // Флаг чтобы не записывать undo во время undo/redo
  
  /**
   * Инициализация менеджера
   */
  init() {
    console.log('🔧 Инициализация UndoManager...');
    
    // Добавляем кнопки Undo/Redo в тулбар
    this._addToolbarButtons();
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
      // Ctrl+Z / Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Ctrl+Shift+Z / Cmd+Shift+Z или Ctrl+Y - Redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        this.redo();
      }
    });
    
    console.log('✅ UndoManager инициализирован');
    this.updateButtons();
  },
  
  /**
   * Добавляет кнопки Undo/Redo в тулбар
   */
  _addToolbarButtons() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) {
      console.warn('⚠️ Тулбар не найден');
      return;
    }
    
    // Находим div с кнопками справа
    const rightButtons = toolbar.querySelector('div:last-child');
    
    // Создаём контейнер для кнопок undo/redo
    const undoRedoContainer = document.createElement('div');
    undoRedoContainer.style.cssText = 'display: flex; gap: 5px; align-items: center;';
    undoRedoContainer.innerHTML = `
      <button id="undoBtn" class="btn-secondary" disabled title="Отменить (Ctrl+Z)">
        ↶ Отменить
      </button>
      <button id="redoBtn" class="btn-secondary" disabled title="Повторить (Ctrl+Shift+Z)">
        ↷ Повторить
      </button>
      <span id="undoCounter" style="font-size: 11px; color: #999;"></span>
    `;
    
    // Вставляем перед кнопкой валидации
    rightButtons.insertBefore(undoRedoContainer, rightButtons.firstChild);
    
    // Навешиваем обработчики
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());
  },
  
  /**
   * Обновляет состояние кнопок
   */
  updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const counter = document.getElementById('undoCounter');
    
    if (!undoBtn || !redoBtn) return;
    
    undoBtn.disabled = this.undoStack.length === 0;
    redoBtn.disabled = this.redoStack.length === 0;
    
    if (counter) {
      if (this.undoStack.length > 0 || this.redoStack.length > 0) {
        counter.textContent = `${this.undoStack.length}/${this.redoStack.length}`;
      } else {
        counter.textContent = '';
      }
    }
  },
  
  /**
   * Сохраняет снимок текущего состояния
   * 
   * @param {string} action - Описание действия
   * @param {Object} options - Опции (beforeData, afterData)
   */
  saveState(action, options = {}) {
    if (this.isApplyingChange) {
      // Не записываем undo во время применения undo/redo
      return;
    }
    
    const state = {
      action,
      timestamp: Date.now(),
      beforeData: options.beforeData || JSON.parse(JSON.stringify(Editor.data)),
      afterData: options.afterData || null // будет заполнено позже
    };
    
    this.undoStack.push(state);
    
    // Ограничиваем размер стека
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
    
    // Очищаем redo стек при новом действии
    this.redoStack = [];
    
    this.updateButtons();
    
    console.log(`💾 Сохранено состояние: ${action} (стек: ${this.undoStack.length})`);
  },
  
  /**
   * Сохраняет снимок ПОСЛЕ действия
   * Вызывается после изменения данных
   */
  saveAfterState() {
    if (this.undoStack.length === 0) return;
    
    const lastState = this.undoStack[this.undoStack.length - 1];
    if (!lastState.afterData) {
      lastState.afterData = JSON.parse(JSON.stringify(Editor.data));
    }
  },
  
  /**
   * Отменить последнее действие
   */
  undo() {
    if (this.undoStack.length === 0) {
      CustomModal.toast('Нечего отменять', 2000, 'info');
      return;
    }
    
    const state = this.undoStack.pop();
    
    console.log(`↶ Отмена: ${state.action}`);
    
    // Сохраняем текущее состояние в redo
    this.redoStack.push({
      action: state.action,
      timestamp: Date.now(),
      beforeData: JSON.parse(JSON.stringify(Editor.data)),
      afterData: state.beforeData
    });
    
    // Применяем предыдущее состояние
    this.isApplyingChange = true;
    Editor.data = JSON.parse(JSON.stringify(state.beforeData));
    Editor.isDirty = true;
    Editor.renderAll();
    this.isApplyingChange = false;
    
    this.updateButtons();
    
    CustomModal.toast(`Отменено: ${state.action}`, 2000, 'success');
  },
  
  /**
   * Повторить отменённое действие
   */
  redo() {
    if (this.redoStack.length === 0) {
      CustomModal.toast('Нечего повторять', 2000, 'info');
      return;
    }
    
    const state = this.redoStack.pop();
    
    console.log(`↷ Повтор: ${state.action}`);
    
    // Сохраняем текущее состояние в undo
    this.undoStack.push({
      action: state.action,
      timestamp: Date.now(),
      beforeData: JSON.parse(JSON.stringify(Editor.data)),
      afterData: state.afterData
    });
    
    // Применяем состояние из redo
    this.isApplyingChange = true;
    Editor.data = JSON.parse(JSON.stringify(state.afterData));
    Editor.isDirty = true;
    Editor.renderAll();
    this.isApplyingChange = false;
    
    this.updateButtons();
    
    CustomModal.toast(`Повторено: ${state.action}`, 2000, 'success');
  },
  
  /**
   * Очистить историю
   */
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
    console.log('🗑️ История undo/redo очищена');
  },
  
  /**
   * Вспомогательный метод для обёртки операций с auto-undo
   * 
   * @param {string} actionName - Название действия
   * @param {Function} fn - Функция с изменениями
   */
  async wrapAction(actionName, fn) {
    // Сохраняем состояние ДО
    this.saveState(actionName);
    
    try {
      // Выполняем действие
      await fn();
      
      // Сохраняем состояние ПОСЛЕ
      this.saveAfterState();
      
      return true;
    } catch (error) {
      console.error(`Ошибка при выполнении ${actionName}:`, error);
      
      // Откатываем последнее состояние из стека
      this.undoStack.pop();
      this.updateButtons();
      
      return false;
    }
  }
};

// Интеграция с Editor
// Переопределяем критичные методы для автоматического сохранения undo

if (typeof Editor !== 'undefined') {
  // При загрузке файла - очищаем историю
  const originalLoadFromFile = Editor.loadFromFile;
  Editor.loadFromFile = function(input) {
    originalLoadFromFile.call(this, input);
    UndoManager.clear();
  };
}

// Интеграция с PoetryEditor
if (typeof PoetryEditor !== 'undefined') {
  // При сохранении стиха
  const originalSavePoem = PoetryEditor.savePoem;
  PoetryEditor.savePoem = function() {
    const poemId = this.currentPoem.id;
    const existingPoem = Editor.data.poetry.find(p => p.id === poemId);
    const actionName = existingPoem 
      ? `Редактирование: ${this.currentPoem.title}`
      : `Создание: ${this.currentPoem.title}`;
    
    UndoManager.saveState(actionName);
    originalSavePoem.call(this);
    UndoManager.saveAfterState();
  };
  
  // При удалении стиха
  const originalDeletePoem = PoetryEditor.deletePoem;
  PoetryEditor.deletePoem = function(id) {
    const poem = Editor.data.poetry.find(p => p.id === id);
    if (!poem) return;
    
    UndoManager.saveState(`Удаление: ${poem.title}`);
    originalDeletePoem.call(this, id);
    UndoManager.saveAfterState();
  };
}

// Интеграция с NewsEditor
if (typeof NewsEditor !== 'undefined') {
  const originalAddNews = NewsEditor.add;
  NewsEditor.add = function() {
    UndoManager.saveState('Добавление новости');
    originalAddNews.call(this);
    UndoManager.saveAfterState();
  };
  
  const originalDeleteNews = NewsEditor.delete;
  NewsEditor.delete = function(idx) {
    const news = Editor.data.news[idx];
    UndoManager.saveState(`Удаление новости: ${news.date}`);
    originalDeleteNews.call(this, idx);
    UndoManager.saveAfterState();
  };
}

// Интеграция с CollectionManager
if (typeof CollectionManager !== 'undefined') {
  const originalRenameCollection = CollectionManager.renameCollection;
  CollectionManager.renameCollection = function(oldName, newName) {
    UndoManager.saveState(`Переименование коллекции: ${oldName} → ${newName}`);
    const result = originalRenameCollection.call(this, oldName, newName);
    UndoManager.saveAfterState();
    return result;
  };
}

console.log('✅ UndoManager загружен');