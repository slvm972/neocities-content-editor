// ============================================
// translationValidator.js — Специфичная валидация для проекта
// Проверяет логику переводов с учётом 4 языков
// ============================================

const TranslationValidator = {
  
  // Константы проекта
  LANGUAGES: ['ru', 'uk', 'he', 'en'],
  MAX_TRANSLATIONS: 4, // Максимум 4 языка
  BILINGUAL_COLLECTION: 'мои стихи на русском с переводом на украинский',
  
  /**
   * Полная валидация всех стихов
   * @returns {Object} - детальный отчёт о проблемах
   */
  validateAll() {
    const report = {
      critical: [],    // Критичные ошибки (требуют исправления)
      warnings: [],    // Предупреждения (рекомендуется проверить)
      info: [],        // Информация (необычные, но допустимые ситуации)
      stats: {
        totalPoems: Editor.data.poetry.length,
        poemsWithTranslations: 0,
        translationGroups: 0,
        bilingualPoems: 0
      }
    };
    
    if (!Editor.data || !Editor.data.poetry) {
      report.critical.push('Данные не загружены');
      return report;
    }
    
    const visited = new Set();
    
    Editor.data.poetry.forEach(poem => {
      // Валидация отдельного стиха
      this.validatePoem(poem, report);
      
      // Подсчёт статистики
      if (poem.translations && poem.translations.length > 0) {
        report.stats.poemsWithTranslations++;
      }
      
      if (poem.collection === this.BILINGUAL_COLLECTION) {
        report.stats.bilingualPoems++;
      }
      
      // Валидация групп переводов
      if (!visited.has(poem.id) && poem.translations && poem.translations.length > 0) {
        const group = TranslationManager.getTranslationGroup(poem.id);
        if (group.length > 1) {
          this.validateGroup(group, report);
          report.stats.translationGroups++;
          group.forEach(p => visited.add(p.id));
        }
      }
    });
    
    return report;
  },
  
  /**
   * Валидация отдельного стиха
   */
  validatePoem(poem, report) {
    const transCount = poem.translations ? poem.translations.length : 0;
    
    // 🔴 КРИТИЧНО: Больше 4 переводов (невозможно при 4 языках)
    if (transCount > this.MAX_TRANSLATIONS) {
      report.critical.push({
        poem: poem.title,
        lang: poem.lang,
        collection: poem.collection,
        issue: `Слишком много переводов: ${transCount} (максимум ${this.MAX_TRANSLATIONS})`,
        transCount
      });
    }
    
    // 🟡 ПРЕДУПРЕЖДЕНИЕ: Ровно 4 перевода — проверяем логику
    if (transCount === this.MAX_TRANSLATIONS) {
      // Должен быть либо в билингвальной коллекции, либо связан с ней
      const isBilingual = poem.collection === this.BILINGUAL_COLLECTION;
      const linkedToBilingual = poem.translations.some(id => {
        const linked = Editor.data.poetry.find(p => p.id === id);
        return linked && linked.collection === this.BILINGUAL_COLLECTION;
      });
      
      if (!isBilingual && !linkedToBilingual) {
        report.warnings.push({
          poem: poem.title,
          lang: poem.lang,
          collection: poem.collection,
          issue: `Имеет ${transCount} перевода, но не связан с билингвальной коллекцией "${this.BILINGUAL_COLLECTION}"`,
          suggestion: `Проверьте, должен ли этот стих быть связан с билингвальной коллекцией`
        });
      }
    }
    
    // 🔵 ИНФОРМАЦИЯ: Проверка языков в группе
    if (transCount > 0) {
      const languages = new Set([poem.lang]);
      poem.translations.forEach(id => {
        const trans = Editor.data.poetry.find(p => p.id === id);
        if (trans) languages.add(trans.lang);
      });
      
      // Дубликаты языков в группе
      const allLangs = [poem.lang];
      poem.translations.forEach(id => {
        const trans = Editor.data.poetry.find(p => p.id === id);
        if (trans) allLangs.push(trans.lang);
      });
      
      const langCounts = {};
      allLangs.forEach(lang => {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      });
      
      const duplicateLangs = Object.entries(langCounts)
        .filter(([lang, count]) => count > 1)
        .map(([lang]) => lang);
      
      if (duplicateLangs.length > 0) {
        report.warnings.push({
          poem: poem.title,
          lang: poem.lang,
          collection: poem.collection,
          issue: `В группе переводов дублируются языки: ${duplicateLangs.join(', ')}`,
          suggestion: 'Проверьте, не добавлены ли разные версии одного стиха на одном языке'
        });
      }
    }
    
    // 🔵 ИНФОРМАЦИЯ: Билингвальная коллекция без переводов
    if (poem.collection === this.BILINGUAL_COLLECTION && transCount === 0) {
      report.info.push({
        poem: poem.title,
        lang: poem.lang,
        issue: `Стих в билингвальной коллекции, но без переводов`,
        suggestion: 'Убедитесь, что это намеренно'
      });
    }
    
    // 🔵 ИНФОРМАЦИЯ: Билингвальная коллекция с языком не ru/uk
    if (poem.collection === this.BILINGUAL_COLLECTION && !['ru', 'uk'].includes(poem.lang)) {
      report.warnings.push({
        poem: poem.title,
        lang: poem.lang,
        collection: poem.collection,
        issue: `Стих в билингвальной коллекции "ru+uk", но язык: ${poem.lang}`,
        suggestion: 'Проверьте правильность коллекции или языка'
      });
    }
  },
  
  /**
   * Валидация группы переводов
   */
  validateGroup(group, report) {
    const groupSize = group.length;
    const languages = new Set(group.map(p => p.lang));
    
    // 🔴 КРИТИЧНО: Группа больше 5 стихов (4 языка + 1 билингвальный)
    if (groupSize > 5) {
      report.critical.push({
        poems: group.map(p => p.title).join(', '),
        issue: `Группа переводов слишком большая: ${groupSize} стихов (ожидается максимум 5)`,
        languages: Array.from(languages).join(', '),
        groupSize
      });
    }
    
    // 🟡 ПРЕДУПРЕЖДЕНИЕ: Группа = 5, проверяем логику
    if (groupSize === 5) {
      const hasBilingual = group.some(p => p.collection === this.BILINGUAL_COLLECTION);
      
      if (!hasBilingual) {
        report.warnings.push({
          poems: group.map(p => p.title).join(', '),
          issue: `Группа из ${groupSize} стихов, но нет стиха из билингвальной коллекции`,
          suggestion: `При 5 стихах ожидается связь с "${this.BILINGUAL_COLLECTION}"`
        });
      }
    }
    
    // 🔵 ИНФОРМАЦИЯ: Неполная группа (меньше 4 языков)
    if (groupSize < this.LANGUAGES.length && groupSize > 1) {
      const missingLangs = this.LANGUAGES.filter(lang => !languages.has(lang));
      
      report.info.push({
        poems: group.map(p => p.title).join(', '),
        languages: Array.from(languages).join(', '),
        issue: `Неполная группа переводов: ${groupSize} стихов на ${languages.size} языках`,
        missingLanguages: missingLangs.join(', '),
        suggestion: 'Возможно, стоит добавить переводы на недостающие языки'
      });
    }
    
    // Проверка симметричности связей (полная клика)
    group.forEach(poem => {
      const expectedLinks = group.filter(p => p.id !== poem.id).map(p => p.id).sort();
      const actualLinks = (poem.translations || []).sort();
      
      if (JSON.stringify(expectedLinks) !== JSON.stringify(actualLinks)) {
        report.critical.push({
          poem: poem.title,
          lang: poem.lang,
          issue: `Нарушена полная клика: ожидается ${expectedLinks.length} связей, фактически ${actualLinks.length}`,
          expected: expectedLinks.length,
          actual: actualLinks.length
        });
      }
    });
  },
  
  /**
   * Генерация читаемого отчёта
   */
  generateReport(validationResult) {
    let report = '═══════════════════════════════════════════\n';
    report += '     ОТЧЁТ ВАЛИДАЦИИ ПЕРЕВОДОВ\n';
    report += '═══════════════════════════════════════════\n\n';
    
    // Статистика
    report += '📊 СТАТИСТИКА:\n';
    report += `   Всего стихов: ${validationResult.stats.totalPoems}\n`;
    report += `   С переводами: ${validationResult.stats.poemsWithTranslations}\n`;
    report += `   Групп переводов: ${validationResult.stats.translationGroups}\n`;
    report += `   В билингвальной коллекции: ${validationResult.stats.bilingualPoems}\n`;
    report += '\n';
    
    // Критичные ошибки
    if (validationResult.critical.length > 0) {
      report += '🔴 КРИТИЧНЫЕ ОШИБКИ:\n';
      validationResult.critical.forEach((item, idx) => {
        report += `\n${idx + 1}. ${item.poem || item.poems || 'Группа'}\n`;
        report += `   ${item.issue}\n`;
        if (item.lang) report += `   Язык: ${item.lang}\n`;
        if (item.collection) report += `   Коллекция: ${item.collection}\n`;
      });
      report += '\n';
    } else {
      report += '✅ Критичных ошибок не найдено\n\n';
    }
    
    // Предупреждения
    if (validationResult.warnings.length > 0) {
      report += '🟡 ПРЕДУПРЕЖДЕНИЯ:\n';
      const maxWarnings = 10;
      validationResult.warnings.slice(0, maxWarnings).forEach((item, idx) => {
        report += `\n${idx + 1}. ${item.poem || item.poems || 'Группа'}\n`;
        report += `   ${item.issue}\n`;
        if (item.suggestion) report += `   💡 ${item.suggestion}\n`;
      });
      if (validationResult.warnings.length > maxWarnings) {
        report += `\n... и ещё ${validationResult.warnings.length - maxWarnings} предупреждений\n`;
      }
      report += '\n';
    }
    
    // Информация
    if (validationResult.info.length > 0) {
      report += '🔵 ИНФОРМАЦИЯ:\n';
      const maxInfo = 5;
      validationResult.info.slice(0, maxInfo).forEach((item, idx) => {
        report += `\n${idx + 1}. ${item.poem || item.poems || 'Группа'}\n`;
        report += `   ${item.issue}\n`;
        if (item.suggestion) report += `   💡 ${item.suggestion}\n`;
      });
      if (validationResult.info.length > maxInfo) {
        report += `\n... и ещё ${validationResult.info.length - maxInfo} пунктов информации\n`;
      }
      report += '\n';
    }
    
    // Итог
    report += '═══════════════════════════════════════════\n';
    if (validationResult.critical.length === 0 && validationResult.warnings.length === 0) {
      report += '🎉 ВСЁ ОТЛИЧНО! Система переводов работает корректно.\n';
    } else {
      report += `⚠️ Найдено проблем: ${validationResult.critical.length} критичных, ${validationResult.warnings.length} предупреждений\n`;
    }
    report += '═══════════════════════════════════════════\n';
    
    return report;
  },
  
  /**
   * Показать отчёт валидации пользователю
   */
  async showReport() {
    console.log('🔍 Запуск валидации переводов...');
    
    const validation = this.validateAll();
    const report = this.generateReport(validation);
    
    console.log(report);
    
    // Используем CustomModal если доступен
    if (typeof CustomModal !== 'undefined') {
      await CustomModal.alert(report, 'Отчёт валидации переводов');
    } else {
      alert(report);
    }
    
    return validation;
  }
};

console.log('✅ TranslationValidator загружен');