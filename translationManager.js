// ============================================
// translationManager.js — Централизованное управление связями переводов
// ФИНАЛЬНАЯ ВЕРСИЯ: только симметричность, полные клики опционально
// ============================================

const TranslationManager = {
  
  /**
   * НОВЫЙ МЕТОД: синхронизирует обратные связи БЕЗ создания клики
   * Используется при сохранении из формы редактирования
   * 
   * @param {string} poemId - ID стиха
   * @param {Array<string>} desiredLinks - массив ID, с которыми ДОЛЖНЫ быть связи
   */
  syncBackLinks(poemId, desiredLinks) {
    const poem = Editor.data.poetry.find(p => p.id === poemId);
    if (!poem) {
      console.warn('⚠️ Стих не найден');
      return;
    }

    // Фильтруем корректные ID
    const validLinks = desiredLinks.filter(id => 
      id !== poemId && Editor.data.poetry.find(p => p.id === id)
    );

    console.log(`🔄 Синхронизация обратных связей для "${poem.title}"`);
    console.log(`  Целевые связи: ${validLinks.length}`);

    // Устанавливаем связи напрямую
    poem.translations = [...validLinks].sort();

    // Синхронизируем обратные связи
    validLinks.forEach(targetId => {
      const target = Editor.data.poetry.find(p => p.id === targetId);
      if (!target) return;

      if (!Array.isArray(target.translations)) {
        target.translations = [];
      }

      // Добавляем обратную связь, если её нет
      if (!target.translations.includes(poemId)) {
        target.translations.push(poemId);
        target.translations.sort();
        console.log(`  ✓ Добавлена обратная связь: ${target.title} → ${poem.title}`);
      }
    });

    // Удаляем обратные связи у тех, кто больше не связан
    Editor.data.poetry.forEach(otherPoem => {
      if (otherPoem.id === poemId) return;
      if (!Array.isArray(otherPoem.translations)) return;

      const hadLink = otherPoem.translations.includes(poemId);
      const shouldHaveLink = validLinks.includes(otherPoem.id);

      if (hadLink && !shouldHaveLink) {
        otherPoem.translations = otherPoem.translations.filter(id => id !== poemId);
        console.log(`  ✓ Удалена обратная связь: ${otherPoem.title} ✗ ${poem.title}`);
      }
    });

    Editor.isDirty = true;
    console.log(`✅ Обратные связи синхронизированы`);
  },

  /**
   * Связывает два стиха как переводы друг друга (полная клика)
   * ИСПРАВЛЕНО: объединяет ВСЕ существующие группы и создаёт полную клику
   * 
   * @param {string} poemIdA - ID первого стиха
   * @param {string} poemIdB - ID второго стиха
   * @returns {boolean} - успешность операции
   */
  linkPoems(poemIdA, poemIdB) {
    if (!poemIdA || !poemIdB || poemIdA === poemIdB) {
      console.warn('⚠️ Некорректные ID для связывания');
      return false;
    }

    const poemA = Editor.data.poetry.find(p => p.id === poemIdA);
    const poemB = Editor.data.poetry.find(p => p.id === poemIdB);

    if (!poemA || !poemB) {
      console.warn('⚠️ Один из стихов не найден');
      return false;
    }

    // Инициализируем массивы, если их нет
    if (!Array.isArray(poemA.translations)) poemA.translations = [];
    if (!Array.isArray(poemB.translations)) poemB.translations = [];

    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: собираем ВСЕ ID из обеих групп
    const allIdsSet = new Set();
    
    // Добавляем сами стихи
    allIdsSet.add(poemIdA);
    allIdsSet.add(poemIdB);
    
    // Добавляем все связи первого стиха
    poemA.translations.forEach(id => allIdsSet.add(id));
    
    // Добавляем все связи второго стиха
    poemB.translations.forEach(id => allIdsSet.add(id));
    
    // Рекурсивно добавляем связи всех найденных стихов
    const processedIds = new Set();
    const toProcess = Array.from(allIdsSet);
    
    while (toProcess.length > 0) {
      const currentId = toProcess.shift();
      if (processedIds.has(currentId)) continue;
      processedIds.add(currentId);
      
      const currentPoem = Editor.data.poetry.find(p => p.id === currentId);
      if (!currentPoem) continue;
      
      if (Array.isArray(currentPoem.translations)) {
        currentPoem.translations.forEach(id => {
          if (!allIdsSet.has(id)) {
            allIdsSet.add(id);
            toProcess.push(id);
          }
        });
      }
    }
    
    const allIds = Array.from(allIdsSet).sort();
    
    console.log(`🔗 Создание полной клики: ${allIds.length} стихов`);

    // Создаём полную клику: каждый стих связан со всеми остальными
    allIds.forEach(currentId => {
      const poem = Editor.data.poetry.find(p => p.id === currentId);
      if (!poem) {
        console.warn(`⚠️ Стих ${currentId} не найден при создании клики`);
        return;
      }
      
      // Новый массив связей: все ID кроме своего
      const newTranslations = allIds.filter(id => id !== currentId).sort();
      
      // ВАЖНО: заменяем массив целиком, не мутируем
      poem.translations = newTranslations;
      
      console.log(`  ✓ ${poem.title}: ${newTranslations.length} связей`);
    });

    Editor.isDirty = true;
    console.log(`✅ Полная клика создана успешно`);
    return true;
  },

  /**
   * Разрывает связь между двумя стихами
   * ВАЖНО: после этого вызовите normalizeAllTranslations()
   * 
   * @param {string} poemIdA - ID первого стиха
   * @param {string} poemIdB - ID второго стиха
   * @returns {boolean} - успешность операции
   */
  unlinkPoems(poemIdA, poemIdB) {
    const poemA = Editor.data.poetry.find(p => p.id === poemIdA);
    const poemB = Editor.data.poetry.find(p => p.id === poemIdB);

    if (!poemA || !poemB) {
      console.warn('⚠️ Один из стихов не найден при разрыве связи');
      return false;
    }

    let changed = false;

    // Удаляем связь симметрично
    if (Array.isArray(poemA.translations)) {
      const before = poemA.translations.length;
      poemA.translations = poemA.translations.filter(id => id !== poemIdB);
      if (poemA.translations.length !== before) changed = true;
    }
    
    if (Array.isArray(poemB.translations)) {
      const before = poemB.translations.length;
      poemB.translations = poemB.translations.filter(id => id !== poemIdA);
      if (poemB.translations.length !== before) changed = true;
    }

    if (changed) {
      Editor.isDirty = true;
      console.log(`🔓 Разорвана связь: ${poemA.title} ↔ ${poemB.title}`);
    }

    return changed;
  },

  /**
   * Обновляет связи стиха (СТАРЫЙ метод, сейчас не используется)
   * ЗАМЕНЁН на syncBackLinks для предотвращения автоматических полных клик
   * 
   * @param {string} poemId - ID стиха
   * @param {Array<string>} newLinksArray - новый массив ID связей
   * @returns {boolean} - успешность операции
   */
  updateLinks(poemId, newLinksArray) {
    const poem = Editor.data.poetry.find(p => p.id === poemId);
    if (!poem) {
      console.warn('⚠️ Стих не найден для обновления связей');
      return false;
    }

    // Нормализуем входные данные
    if (!Array.isArray(newLinksArray)) {
      newLinksArray = [];
    }
    
    // Убираем некорректные ID
    newLinksArray = newLinksArray.filter(id => {
      if (id === poemId) return false; // самоссылка
      if (!Editor.data.poetry.find(p => p.id === id)) return false; // несуществующий
      return true;
    });

    const oldLinks = Array.isArray(poem.translations) ? [...poem.translations] : [];
    
    console.log(`🔄 Обновление связей для "${poem.title}"`);
    console.log(`  Старые: ${oldLinks.length}, Новые: ${newLinksArray.length}`);

    // Вычисляем разницу
    const toRemove = oldLinks.filter(id => !newLinksArray.includes(id));
    const toAdd = newLinksArray.filter(id => !oldLinks.includes(id));

    console.log(`  Удалить: ${toRemove.length}, Добавить: ${toAdd.length}`);

    // Сначала разрываем старые связи
    toRemove.forEach(targetId => {
      console.log(`    🔓 Разрыв с: ${targetId}`);
      this.unlinkPoems(poemId, targetId);
    });

    // Затем создаём новые связи
    toAdd.forEach(targetId => {
      console.log(`    🔗 Связь с: ${targetId}`);
      this.linkPoems(poemId, targetId);
    });

    // ОБЯЗАТЕЛЬНАЯ нормализация
    console.log(`  🔧 Нормализация после обновления...`);
    this.normalizeAllTranslations();

    return true;
  },

  /**
   * Получить все переводы для стиха (только прямые связи)
   * 
   * @param {string} poemId - ID стиха
   * @returns {Array} - массив объектов стихов-переводов
   */
  getTranslations(poemId) {
    const poem = Editor.data.poetry.find(p => p.id === poemId);
    if (!poem || !Array.isArray(poem.translations)) return [];

    // Возвращаем только существующие стихи
    return poem.translations
      .map(id => Editor.data.poetry.find(p => p.id === id))
      .filter(Boolean);
  },

  /**
   * Получить всю группу переводов (компонента связности)
   * 
   * @param {string} poemId - ID стиха
   * @returns {Array} - массив объектов всех взаимосвязанных стихов
   */
  getTranslationGroup(poemId) {
    const visited = new Set();
    const group = [];
    const queue = [poemId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const poem = Editor.data.poetry.find(p => p.id === currentId);
      if (!poem) {
        console.warn(`⚠️ Стих ${currentId} не найден при обходе группы`);
        continue;
      }

      group.push(poem);

      if (Array.isArray(poem.translations)) {
        poem.translations.forEach(transId => {
          if (!visited.has(transId)) {
            queue.push(transId);
          }
        });
      }
    }

    return group;
  },

  /**
   * ПЕРЕРАБОТАННАЯ НОРМАЛИЗАЦИЯ — только проверка симметричности
   * НЕ создаёт полные клики, а только синхронизирует обратные связи
   * 
   * @returns {Array} - массив сообщений о выполненных изменениях
   */
  normalizeAllTranslations() {
    console.log('🔧 Запуск нормализации связей (только симметричность)...');
    const issues = [];
    let totalChanges = 0;

    // ШАГ 1: Базовая очистка каждого стиха
    Editor.data.poetry.forEach(poem => {
      if (!Array.isArray(poem.translations)) {
        poem.translations = [];
        return;
      }

      const before = poem.translations.length;

      // 1. Удаляем несуществующие ID
      poem.translations = poem.translations.filter(id => {
        const exists = Editor.data.poetry.some(p => p.id === id);
        if (!exists) {
          issues.push(`❌ ${poem.title}: удалена ссылка на несуществующий стих ${id}`);
        }
        return exists;
      });

      // 2. Удаляем самоссылки
      if (poem.translations.includes(poem.id)) {
        poem.translations = poem.translations.filter(id => id !== poem.id);
        issues.push(`⚠️ ${poem.title}: удалена самоссылка`);
      }

      // 3. Убираем дубликаты
      const unique = [...new Set(poem.translations)];
      if (unique.length !== poem.translations.length) {
        issues.push(`⚠️ ${poem.title}: удалено ${poem.translations.length - unique.length} дубликатов`);
        poem.translations = unique;
      }

      // 4. Сортируем для стабильности
      poem.translations.sort();

      if (poem.translations.length !== before) {
        totalChanges++;
        Editor.isDirty = true;
      }
    });

    // ШАГ 2: Синхронизация обратных связей (без создания клик)
    const processed = new Set();
    
    Editor.data.poetry.forEach(poem => {
      if (!poem.translations || poem.translations.length === 0) return;

      poem.translations.forEach(targetId => {
        const pairKey = [poem.id, targetId].sort().join('|');
        if (processed.has(pairKey)) return;
        processed.add(pairKey);

        const target = Editor.data.poetry.find(p => p.id === targetId);
        if (!target) return;

        if (!Array.isArray(target.translations)) {
          target.translations = [];
        }

        // Проверяем симметричность
        const hasBackLink = target.translations.includes(poem.id);

        if (!hasBackLink) {
          target.translations.push(poem.id);
          target.translations.sort();
          issues.push(`🔗 ${target.title}: добавлена обратная связь с ${poem.title}`);
          totalChanges++;
          Editor.isDirty = true;
        }
      });
    });

    if (totalChanges > 0) {
      console.log(`✅ Нормализация завершена: ${totalChanges} изменений`);
      if (issues.length <= 10) {
        issues.forEach(i => console.log(`  ${i}`));
      } else {
        console.log(`  ... ${issues.length} изменений (см. возвращаемое значение)`);
      }
    } else {
      console.log('✅ Все связи корректны');
    }

    return issues;
  },

  /**
   * НОВЫЙ МЕТОД: принудительное создание полных клик
   * Вызывается только явно пользователем через кнопку
   */
  forceFullCliques() {
    console.log('🔧 Принудительное создание полных клик...');
    const issues = [];
    let totalChanges = 0;

    // Сначала базовая очистка
    this.normalizeAllTranslations();

    // Находим компоненты связности
    const visited = new Set();
    const components = [];

    Editor.data.poetry.forEach(poem => {
      if (visited.has(poem.id)) return;
      if (!poem.translations || poem.translations.length === 0) {
        visited.add(poem.id);
        return;
      }

      const component = [];
      const queue = [poem.id];
      
      while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        
        visited.add(currentId);
        const currentPoem = Editor.data.poetry.find(p => p.id === currentId);
        
        if (!currentPoem) continue;
        component.push(currentId);

        if (Array.isArray(currentPoem.translations)) {
          currentPoem.translations.forEach(id => {
            if (!visited.has(id)) {
              queue.push(id);
            }
          });
        }
      }

      if (component.length > 1) {
        components.push(component);
      }
    });

    console.log(`📊 Найдено компонент связности: ${components.length}`);

    // Превращаем каждую компоненту в полную клику
    components.forEach((component, idx) => {
      console.log(`  Компонента ${idx + 1}: ${component.length} стихов`);

      component.forEach(id => {
        const poem = Editor.data.poetry.find(p => p.id === id);
        if (!poem) return;

        const shouldHave = component.filter(cId => cId !== id).sort();
        const currentHas = (poem.translations || []).sort();

        const isDifferent = 
          shouldHave.length !== currentHas.length ||
          shouldHave.some((id, idx) => id !== currentHas[idx]);

        if (isDifferent) {
          poem.translations = shouldHave;
          issues.push(`🔧 ${poem.title}: создана полная клика (${shouldHave.length} связей)`);
          totalChanges++;
          Editor.isDirty = true;
        }
      });
    });

    console.log(`✅ Создание полных клик завершено: ${totalChanges} изменений`);
    
    return { totalChanges, issues, components: components.length };
  },

  /**
   * Валидация связей (проверка без изменений)
   */
  validateTranslations() {
    const errors = [];
    const warnings = [];

    Editor.data.poetry.forEach(poem => {
      if (!Array.isArray(poem.translations)) return;

      poem.translations.forEach(targetId => {
        const target = Editor.data.poetry.find(p => p.id === targetId);
        if (!target) {
          errors.push({ poem: poem.title, issue: `Ссылка на несуществующий: ${targetId}` });
          return;
        }

        if (!target.translations || !target.translations.includes(poem.id)) {
          warnings.push({
            poem: poem.title,
            target: target.title,
            issue: 'Односторонняя связь'
          });
        }
      });

      if (poem.translations.includes(poem.id)) {
        errors.push({ poem: poem.title, issue: 'Самоссылка' });
      }

      const unique = new Set(poem.translations);
      if (unique.size !== poem.translations.length) {
        warnings.push({ poem: poem.title, issue: 'Дубликаты' });
      }
    });

    return { errors, warnings };
  },

  /**
   * Удаление стиха с очисткой всех связей
   */
  deletePoemWithCleanup(poemId) {
    const poem = Editor.data.poetry.find(p => p.id === poemId);
    if (!poem) return false;

    console.log(`🗑️ Удаление стиха: ${poem.title}`);

    const translationsCopy = poem.translations ? [...poem.translations] : [];

    // Разрываем все связи
    translationsCopy.forEach(targetId => {
      const target = Editor.data.poetry.find(p => p.id === targetId);
      if (target && Array.isArray(target.translations)) {
        target.translations = target.translations.filter(id => id !== poemId);
      }
    });

    // Удаляем стих
    Editor.data.poetry = Editor.data.poetry.filter(p => p.id !== poemId);
    Editor.isDirty = true;

    console.log(`✅ Удалено, разорвано связей: ${translationsCopy.length}`);
    
    // Нормализуем оставшиеся связи
    this.normalizeAllTranslations();
    
    return true;
  },

  /**
   * Статистика по переводам
   */
  getStatistics() {
    let totalPoems = Editor.data.poetry.length;
    let poemsWithTranslations = 0;
    let totalLinks = 0;
    let translationGroups = [];

    const visited = new Set();

    Editor.data.poetry.forEach(poem => {
      if (poem.translations && poem.translations.length > 0) {
        poemsWithTranslations++;
        totalLinks += poem.translations.length;
      }

      if (!visited.has(poem.id)) {
        const group = this.getTranslationGroup(poem.id);
        if (group.length > 1) {
          translationGroups.push(group);
          group.forEach(p => visited.add(p.id));
        }
      }
    });

    return {
      totalPoems,
      poemsWithTranslations,
      totalLinks: totalLinks / 2,
      translationGroups: translationGroups.length,
      averageGroupSize: translationGroups.length > 0 
        ? (translationGroups.reduce((sum, g) => sum + g.length, 0) / translationGroups.length).toFixed(1)
        : 0,
      largestGroup: translationGroups.length > 0
        ? Math.max(...translationGroups.map(g => g.length))
        : 0
    };
  }
};

console.log('✅ TranslationManager загружен');