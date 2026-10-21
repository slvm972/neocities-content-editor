// ============================================
// duplicateDetector.js — Детектор дубликатов стихов
// ============================================

const DuplicateDetector = {
  
  duplicates: [],
  currentPreview: null,

  /**
   * Вычисляет схожесть двух текстов (0-100%)
   */
  textSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const t1 = normalize(text1);
    const t2 = normalize(text2);
    
    if (t1 === t2) return 100;
    
    // Простое сравнение по длине и общим словам
    const words1 = new Set(t1.split(' '));
    const words2 = new Set(t2.split(' '));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    
    const similarity = (intersection.size * 2) / (words1.size + words2.size) * 100;
    return Math.round(similarity);
  },

  /**
   * Категоризирует пару дубликатов
   */
  categorizePair(poemA, poemB, similarity) {
    // 🔴 Критические
    if (poemA.collection === poemB.collection && poemA.title === poemB.title) {
      return { level: 'critical', reason: 'Одинаковые title+lang в одной коллекции' };
    }
    
    if (poemA.slug && poemB.slug && poemA.slug === poemB.slug) {
      return { level: 'critical', reason: 'Конфликт slug (одинаковый URL)' };
    }
    
    if (similarity >= 95) {
      const daysDiff = Math.abs(
        (new Date(poemA.date_published || 0) - new Date(poemB.date_published || 0)) / 86400000
      );
      if (daysDiff < 7) {
        return { level: 'critical', reason: 'Идентичный текст, добавлены в одно время' };
      }
    }
    
    // 🟢 Вероятно намеренные
    if (poemA.translations?.length > 0 && poemB.translations?.length > 0) {
      if (poemA.collection !== poemB.collection) {
        return { level: 'intentional', reason: 'Оба имеют переводы в разных коллекциях' };
      }
    }
    
    // 🟡 Подозрительные (по умолчанию)
    return { level: 'suspicious', reason: 'Одинаковые title+lang, нужна проверка' };
  },

  /**
   * Проверяет, помечена ли пара как намеренный дубликат
   */
  isMarkedIntentional(idA, idB) {
    if (!Editor.data.intentional_duplicates) return false;
    
    return Editor.data.intentional_duplicates.some(item => {
      const [p1, p2] = item.pair;
      return (p1 === idA && p2 === idB) || (p1 === idB && p2 === idA);
    });
  },

  /**
   * Основной поиск дубликатов
   */
  findDuplicates() {
    if (!Editor.data || !Editor.data.poetry) {
      console.error('❌ Данные не загружены');
      return [];
    }
    
    const poems = Editor.data.poetry;
    const duplicates = [];
    const processed = new Set();
    
    for (let i = 0; i < poems.length; i++) {
      for (let j = i + 1; j < poems.length; j++) {
        const poemA = poems[i];
        const poemB = poems[j];
        
        const pairKey = [poemA.id, poemB.id].sort().join('|');
        if (processed.has(pairKey)) continue;
        
        let isDuplicate = false;
        let matchType = '';
        
        // Проверка 1: title + lang
        if (poemA.title === poemB.title && poemA.lang === poemB.lang) {
          isDuplicate = true;
          matchType = 'title+lang';
        }
        
        // Проверка 2: slug
        if (poemA.slug && poemB.slug && poemA.slug === poemB.slug) {
          isDuplicate = true;
          matchType = 'slug';
        }
        
        // Проверка 3: схожесть текста
        if (!isDuplicate && poemA.text && poemB.text) {
          const similarity = this.textSimilarity(poemA.text, poemB.text);
          if (similarity >= 90) {
            isDuplicate = true;
            matchType = `text (${similarity}%)`;
          }
        }
        
        if (isDuplicate) {
          const similarity = this.textSimilarity(poemA.text || '', poemB.text || '');
          const category = this.categorizePair(poemA, poemB, similarity);
          const isIntentional = this.isMarkedIntentional(poemA.id, poemB.id);
          
          if (isIntentional) {
            category.level = 'intentional';
            category.reason = 'Помечено пользователем как намеренный дубликат';
          }
          
          duplicates.push({
            poemA,
            poemB,
            similarity,
            matchType,
            category,
            isIntentional
          });
          
          processed.add(pairKey);
        }
      }
    }
    
    this.duplicates = duplicates;
    console.log(`🔍 Найдено дубликатов: ${duplicates.length}`);
    
    return duplicates;
  },

  /**
   * Получает первые N строф из текста
   */
  getStanzas(text, count = 2) {
    if (!text) return '';
    
    // Разбиваем по двойным переносам строк (строфы)
    const stanzas = text.split(/\n\s*\n/).filter(s => s.trim());
    
    if (stanzas.length <= count) return text;
    
    return stanzas.slice(0, count).join('\n\n') + '\n\n[...]';
  },

  /**
   * Показывает превью стиха
   */
  showPreview(poem) {
    const modal = document.getElementById('poemPreviewModal');
    if (!modal) {
      console.error('Модальное окно превью не найдено');
      return;
    }
    
    const preview = this.getStanzas(poem.text, 2);
    const fullLength = (poem.text || '').length;
    const previewLength = preview.replace('[...]', '').length;
    
    document.getElementById('preview-title').textContent = poem.title;
    document.getElementById('preview-meta').innerHTML = `
      <span class="badge badge-${poem.lang}">${poem.lang.toUpperCase()}</span>
      <span style="color:#666;">ID: ${poem.id}</span>
      <span style="color:#666;">Коллекция: ${poem.collection || 'не указана'}</span>
    `;
    document.getElementById('preview-text').textContent = preview;
    document.getElementById('preview-info').innerHTML = `
      Показано: ${previewLength} из ${fullLength} символов<br>
      ${poem.slug ? `Slug: <code>${poem.slug}</code><br>` : ''}
      ${poem.date_published ? `Дата: ${poem.date_published}<br>` : ''}
      Переводов: ${poem.translations?.length || 0}
    `;
    
    this.currentPreview = poem;
    modal.style.display = 'block';
  },

  closePreview() {
    const modal = document.getElementById('poemPreviewModal');
    if (modal) modal.style.display = 'none';
    this.currentPreview = null;
  },

  /**
   * Отмечает пару как намеренный дубликат
   */
  markAsIntentional(idA, idB, reason = '') {
    if (!Editor.data.intentional_duplicates) {
      Editor.data.intentional_duplicates = [];
    }
    
    // Проверяем, не добавлена ли уже
    if (this.isMarkedIntentional(idA, idB)) {
      console.log('⚠️ Пара уже помечена как намеренный дубликат');
      return;
    }
    
    Editor.data.intentional_duplicates.push({
      pair: [idA, idB],
      reason: reason || 'Намеренный дубликат',
      marked_at: new Date().toISOString().split('T')[0]
    });
    
    Editor.isDirty = true;
    console.log(`✅ Пара помечена как намеренный дубликат`);
  },

  /**
   * Рендер интерфейса детектора
   */
  render() {
    const container = document.getElementById('duplicatesContent');
    if (!container) return;
    
    container.innerHTML = `
      <div class="card">
        <h3>🔍 Поиск дубликатов</h3>
        <div style="margin: 20px 0;">
          <button class="btn-load" onclick="DuplicateDetector.runSearch()">🔍 Найти дубликаты</button>
          <button class="btn-secondary" onclick="DuplicateDetector.autoFillSlugs()">🔤 Сгенерировать все slug</button>
        </div>
        
        <div id="duplicateStats" style="background:#f8f9fa; padding:15px; border-radius:6px; margin-top:15px; display:none;">
          <div id="statsContent"></div>
        </div>
      </div>
      
      <div id="duplicatesList" class="card" style="display:none; margin-top:20px;">
        <h3>Результаты</h3>
        <div id="duplicatesResults"></div>
      </div>
    `;
  },

  autoFillSlugs() {
    const filled = SlugHelper.fillAllEmpty(Editor.data.poetry);
    Editor.isDirty = true;
    Editor.renderAll();
    alert(`✅ Сгенерировано slug для ${filled} стихов`);
  },

  runSearch() {
    const duplicates = this.findDuplicates();
    
    const critical = duplicates.filter(d => d.category.level === 'critical');
    const suspicious = duplicates.filter(d => d.category.level === 'suspicious');
    const intentional = duplicates.filter(d => d.category.level === 'intentional');
    
    // Показываем статистику
    const statsDiv = document.getElementById('duplicateStats');
    const statsContent = document.getElementById('statsContent');
    
    statsContent.innerHTML = `
      <strong>Найдено дубликатов: ${duplicates.length}</strong><br>
      🔴 Критические: ${critical.length}<br>
      🟡 Подозрительные: ${suspicious.length}<br>
      🟢 Намеренные: ${intentional.length}
    `;
    statsDiv.style.display = 'block';
    
    // Рендерим список
    this.renderDuplicatesList(duplicates);
  },

  renderDuplicatesList(duplicates) {
    const listDiv = document.getElementById('duplicatesList');
    const resultsDiv = document.getElementById('duplicatesResults');
    
    if (duplicates.length === 0) {
      resultsDiv.innerHTML = '<p style="color:#28a745; text-align:center; padding:20px;">✅ Дубликатов не найдено!</p>';
      listDiv.style.display = 'block';
      return;
    }
    
    let html = '';
    
    duplicates.forEach((dup, idx) => {
      const icon = dup.category.level === 'critical' ? '🔴' : 
                   dup.category.level === 'suspicious' ? '🟡' : '🟢';
      
      html += `
        <div class="duplicate-card" style="border: 2px solid ${dup.category.level === 'critical' ? '#dc3545' : dup.category.level === 'suspicious' ? '#ffc107' : '#28a745'}; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <strong>${icon} ${dup.category.reason}</strong>
            <span style="color:#666; font-size:12px;">Совпадение: ${dup.matchType}</span>
          </div>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:15px 0;">
            <div style="border-right:1px solid #ddd; padding-right:15px;">
              <div style="margin-bottom:5px;">
                <strong style="cursor:pointer; color:var(--primary);" onclick="DuplicateDetector.showPreview(Editor.data.poetry.find(p => p.id === '${dup.poemA.id}'))">
                  🔍 ${dup.poemA.title}
                </strong>
              </div>
              <div style="font-size:12px; color:#666;">
                ID: ${dup.poemA.id}<br>
                Коллекция: ${dup.poemA.collection || 'нет'}<br>
                Slug: ${dup.poemA.slug || 'нет'}<br>
                Переводов: ${dup.poemA.translations?.length || 0}<br>
                Дата: ${dup.poemA.date_published || 'нет'}
              </div>
            </div>
            
            <div>
              <div style="margin-bottom:5px;">
                <strong style="cursor:pointer; color:var(--primary);" onclick="DuplicateDetector.showPreview(Editor.data.poetry.find(p => p.id === '${dup.poemB.id}'))">
                  🔍 ${dup.poemB.title}
                </strong>
              </div>
              <div style="font-size:12px; color:#666;">
                ID: ${dup.poemB.id}<br>
                Коллекция: ${dup.poemB.collection || 'нет'}<br>
                Slug: ${dup.poemB.slug || 'нет'}<br>
                Переводов: ${dup.poemB.translations?.length || 0}<br>
                Дата: ${dup.poemB.date_published || 'нет'}
              </div>
            </div>
          </div>
          
          <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:15px;">
            <button class="btn-secondary" onclick="DuplicateDetector.keepBoth('${dup.poemA.id}', '${dup.poemB.id}')">✅ Оставить оба</button>
            <button class="btn-load" onclick="DuplicateDetector.mergePoems('${dup.poemA.id}', '${dup.poemB.id}', 'A')">🔗 Объединить → A</button>
            <button class="btn-load" onclick="DuplicateDetector.mergePoems('${dup.poemA.id}', '${dup.poemB.id}', 'B')">🔗 Объединить → B</button>
            <button class="btn-danger" style="font-size:12px;" onclick="DuplicateDetector.deletePoem('${dup.poemA.id}')">🗑️ Удалить A</button>
            <button class="btn-danger" style="font-size:12px;" onclick="DuplicateDetector.deletePoem('${dup.poemB.id}')">🗑️ Удалить B</button>
          </div>
        </div>
      `;
    });
    
    resultsDiv.innerHTML = html;
    listDiv.style.display = 'block';
  },

  keepBoth(idA, idB) {
    this.markAsIntentional(idA, idB, 'Пользователь решил оставить оба');
    alert('✅ Пара помечена как намеренный дубликат');
    this.runSearch(); // Обновляем список
  },

  mergePoems(idA, idB, keepWhich) {
    const poemA = Editor.data.poetry.find(p => p.id === idA);
    const poemB = Editor.data.poetry.find(p => p.id === idB);
    
    if (!poemA || !poemB) {
      alert('Ошибка: стих не найден');
      return;
    }
    
    const keep = keepWhich === 'A' ? poemA : poemB;
    const remove = keepWhich === 'A' ? poemB : poemA;
    
    // Обработка slug
    if (keep.slug && remove.slug && keep.slug !== remove.slug) {
      const choice = confirm(
        `У обоих стихов есть slug:\n\n` +
        `Сохраняемый: ${keep.slug}\n` +
        `Удаляемый: ${remove.slug}\n\n` +
        `Оставить slug сохраняемого стиха?\n` +
        `(Отмена = выбрать вручную)`
      );
      
      if (choice === null) {
        const newSlug = prompt('Введите slug для объединённого стиха:', keep.slug);
        if (newSlug) keep.slug = newSlug;
      }
    } else if (!keep.slug && remove.slug) {
      keep.slug = remove.slug;
    }
    
    // Обработка переводов
    const keepTrans = keep.translations || [];
    const removeTrans = remove.translations || [];
    
    if (removeTrans.length > 0) {
      const mergeChoice = confirm(
        `Удаляемый стих имеет переводы: ${removeTrans.length}\n\n` +
        `Перенести их на сохраняемый стих?`
      );
      
      if (mergeChoice) {
        removeTrans.forEach(transId => {
          if (!keepTrans.includes(transId)) {
            TranslationManager.linkPoems(keep.id, transId);
          }
        });
      }
    }
    
    // Удаляем стих через TranslationManager
    TranslationManager.deletePoemWithCleanup(remove.id);
    
    // После объединения создаём полные клики
    console.log('🔧 Нормализация после объединения (с полными кликами)...');
    TranslationManager.normalizeAllTranslations(true); // true = создать клики
    
    Editor.isDirty = true;
    Editor.renderAll();
    
    alert(`✅ Стихи объединены. Сохранён: ${keep.title}`);
    this.runSearch(); // Обновляем список
  },

  deletePoem(id) {
    const poem = Editor.data.poetry.find(p => p.id === id);
    if (!poem) return;
    
    if (confirm(`Удалить стих "${poem.title}"?`)) {
      TranslationManager.deletePoemWithCleanup(id);
      Editor.isDirty = true;
      Editor.renderAll();
      alert('✅ Стих удалён');
      this.runSearch();
    }
  }
};