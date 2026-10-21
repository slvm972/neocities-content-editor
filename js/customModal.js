// ============================================
// customModal.js — Кастомная система модальных окон
// Замена alert/prompt/confirm на красивые модалки
// ============================================

const CustomModal = {
  
  /**
   * Инициализация модальных окон
   * Вызывается при загрузке страницы
   */
  init() {
    // Проверяем, есть ли уже модалки в DOM
    if (document.getElementById('customModalOverlay')) {
      console.log('⚠️ Модальные окна уже инициализированы');
      return;
    }
    
    // Создаём HTML для модалок
    const modalHTML = `
      <!-- Оверлей для затемнения фона -->
      <div id="customModalOverlay" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        backdrop-filter: blur(3px);
      "></div>
      
      <!-- Модалка Alert -->
      <div id="customAlertModal" class="custom-modal" style="display: none;">
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="customAlertTitle">Уведомление</h3>
          </div>
          <div class="custom-modal-body">
            <p id="customAlertMessage"></p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn-load" id="customAlertOk">OK</button>
          </div>
        </div>
      </div>
      
      <!-- Модалка Confirm -->
      <div id="customConfirmModal" class="custom-modal" style="display: none;">
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="customConfirmTitle">Подтверждение</h3>
          </div>
          <div class="custom-modal-body">
            <p id="customConfirmMessage"></p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn-secondary" id="customConfirmCancel">Отмена</button>
            <button class="btn-load" id="customConfirmOk">OK</button>
          </div>
        </div>
      </div>
      
      <!-- Модалка Prompt -->
      <div id="customPromptModal" class="custom-modal" style="display: none;">
        <div class="custom-modal-content">
          <div class="custom-modal-header">
            <h3 id="customPromptTitle">Введите значение</h3>
          </div>
          <div class="custom-modal-body">
            <p id="customPromptMessage"></p>
            <input type="text" id="customPromptInput" style="width: 100%; padding: 10px; margin-top: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
          </div>
          <div class="custom-modal-footer">
            <button class="btn-secondary" id="customPromptCancel">Отмена</button>
            <button class="btn-load" id="customPromptOk">OK</button>
          </div>
        </div>
      </div>
      
      <style>
        .custom-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          animation: modalFadeIn 0.2s ease-out;
        }
        
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        
        .custom-modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          min-width: 400px;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .custom-modal-header {
          padding: 20px 25px;
          border-bottom: 1px solid #eee;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .custom-modal-header h3 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
        }
        
        .custom-modal-body {
          padding: 25px;
          overflow-y: auto;
          flex: 1;
        }
        
        .custom-modal-body p {
          margin: 0 0 10px 0;
          line-height: 1.6;
          color: #333;
          white-space: pre-wrap;
        }
        
        .custom-modal-footer {
          padding: 15px 25px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #f8f9fa;
        }
        
        .custom-modal-footer button {
          min-width: 80px;
        }
        
        /* Адаптивность для мобильных */
        @media (max-width: 600px) {
          .custom-modal-content {
            min-width: 90vw;
            margin: 0 20px;
          }
        }
      </style>
    `;
    
    // Добавляем в body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Навешиваем обработчики
    this._attachEventListeners();
    
    console.log('✅ Кастомные модальные окна инициализированы');
  },
  
  /**
   * Привязка обработчиков событий
   */
  _attachEventListeners() {
    // Alert OK
    document.getElementById('customAlertOk').addEventListener('click', () => {
      this._hideModal('customAlertModal');
      if (this._alertResolve) this._alertResolve();
    });
    
    // Confirm OK/Cancel
    document.getElementById('customConfirmOk').addEventListener('click', () => {
      this._hideModal('customConfirmModal');
      if (this._confirmResolve) this._confirmResolve(true);
    });
    
    document.getElementById('customConfirmCancel').addEventListener('click', () => {
      this._hideModal('customConfirmModal');
      if (this._confirmResolve) this._confirmResolve(false);
    });
    
    // Prompt OK/Cancel
    document.getElementById('customPromptOk').addEventListener('click', () => {
      const value = document.getElementById('customPromptInput').value;
      this._hideModal('customPromptModal');
      if (this._promptResolve) this._promptResolve(value);
    });
    
    document.getElementById('customPromptCancel').addEventListener('click', () => {
      this._hideModal('customPromptModal');
      if (this._promptResolve) this._promptResolve(null);
    });
    
    // Enter в prompt
    document.getElementById('customPromptInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('customPromptOk').click();
      }
    });
    
    // Escape для закрытия
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.getElementById('customAlertModal').style.display !== 'none') {
          document.getElementById('customAlertOk').click();
        } else if (document.getElementById('customConfirmModal').style.display !== 'none') {
          document.getElementById('customConfirmCancel').click();
        } else if (document.getElementById('customPromptModal').style.display !== 'none') {
          document.getElementById('customPromptCancel').click();
        }
      }
    });
    
    // Клик по оверлею закрывает модалку
    document.getElementById('customModalOverlay').addEventListener('click', () => {
      if (document.getElementById('customAlertModal').style.display !== 'none') {
        document.getElementById('customAlertOk').click();
      } else if (document.getElementById('customConfirmModal').style.display !== 'none') {
        document.getElementById('customConfirmCancel').click();
      } else if (document.getElementById('customPromptModal').style.display !== 'none') {
        document.getElementById('customPromptCancel').click();
      }
    });
  },
  
  /**
   * Показать модалку
   */
  _showModal(modalId) {
    document.getElementById('customModalOverlay').style.display = 'block';
    document.getElementById(modalId).style.display = 'block';
  },
  
  /**
   * Скрыть модалку
   */
  _hideModal(modalId) {
    document.getElementById('customModalOverlay').style.display = 'none';
    document.getElementById(modalId).style.display = 'none';
  },
  
  /**
   * Кастомный Alert
   * 
   * @param {string} message - Сообщение
   * @param {string} title - Заголовок (опционально)
   * @returns {Promise<void>}
   */
  alert(message, title = 'Уведомление') {
    return new Promise((resolve) => {
      document.getElementById('customAlertTitle').textContent = title;
      document.getElementById('customAlertMessage').textContent = message;
      
      this._alertResolve = resolve;
      this._showModal('customAlertModal');
    });
  },
  
  /**
   * Кастомный Confirm
   * 
   * @param {string} message - Сообщение
   * @param {string} title - Заголовок (опционально)
   * @returns {Promise<boolean>}
   */
  confirm(message, title = 'Подтверждение') {
    return new Promise((resolve) => {
      document.getElementById('customConfirmTitle').textContent = title;
      document.getElementById('customConfirmMessage').textContent = message;
      
      this._confirmResolve = resolve;
      this._showModal('customConfirmModal');
    });
  },
  
  /**
   * Кастомный Prompt
   * 
   * @param {string} message - Сообщение
   * @param {string} defaultValue - Значение по умолчанию
   * @param {string} title - Заголовок (опционально)
   * @returns {Promise<string|null>}
   */
  prompt(message, defaultValue = '', title = 'Введите значение') {
    return new Promise((resolve) => {
      document.getElementById('customPromptTitle').textContent = title;
      document.getElementById('customPromptMessage').textContent = message;
      document.getElementById('customPromptInput').value = defaultValue;
      
      this._promptResolve = resolve;
      this._showModal('customPromptModal');
      
      // Фокус на input
      setTimeout(() => {
        const input = document.getElementById('customPromptInput');
        input.focus();
        input.select();
      }, 100);
    });
  },
  
  /**
   * Кастомное уведомление с автозакрытием
   * 
   * @param {string} message - Сообщение
   * @param {number} duration - Длительность в мс (по умолчанию 3000)
   * @param {string} type - Тип: 'success', 'error', 'warning', 'info'
   */
  toast(message, duration = 3000, type = 'info') {
    // Создаём элемент toast
    const toast = document.createElement('div');
    toast.className = `custom-toast custom-toast-${type}`;
    toast.textContent = message;
    
    // Стили для toast
    const style = document.createElement('style');
    if (!document.getElementById('custom-toast-styles')) {
      style.id = 'custom-toast-styles';
      style.textContent = `
        .custom-toast {
          position: fixed;
          bottom: 30px;
          right: 30px;
          padding: 15px 25px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10001;
          animation: toastSlideIn 0.3s ease-out;
          max-width: 400px;
          font-size: 14px;
          font-weight: 500;
        }
        
        @keyframes toastSlideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
        
        .custom-toast-success {
          border-left: 4px solid #28a745;
          color: #155724;
        }
        
        .custom-toast-error {
          border-left: 4px solid #dc3545;
          color: #721c24;
        }
        
        .custom-toast-warning {
          border-left: 4px solid #ffc107;
          color: #856404;
        }
        
        .custom-toast-info {
          border-left: 4px solid #007bff;
          color: #004085;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Добавляем в DOM
    document.body.appendChild(toast);
    
    // Удаляем через duration
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, duration);
  }
};

// Автоинициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CustomModal.init());
} else {
  CustomModal.init();
}

console.log('✅ CustomModal загружен');