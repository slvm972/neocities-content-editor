// ============================================
// slugHelper.js — Утилиты для работы со slug
// ============================================

const SlugHelper = {
  
  // Таблицы транслитерации
  translitRU: {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  },
  
  translitUK: {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e',
    'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya'
  },
  
  translitHE: {
    'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
    'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
    'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'f',
    'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
  },

  /**
   * Валидация slug (только латиница, цифры, дефисы)
   */
  validateSlug(slug) {
    if (!slug) return { valid: false, error: 'Slug не может быть пустым' };
    
    const regex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    
    if (!regex.test(slug)) {
      return { 
        valid: false, 
        error: 'Slug может содержать только строчные латинские буквы, цифры и дефисы (без пробелов)' 
      };
    }
    
    if (slug.length > 60) {
      return { valid: false, error: 'Slug слишком длинный (максимум 60 символов)' };
    }
    
    return { valid: true };
  },

  /**
   * Генерирует slug из названия с учётом языка
   */
  generate(title, lang) {
    if (!title) return '';
    
    let text = title.toLowerCase().trim();
    
    // Выбираем таблицу транслитерации
    let translitTable = {};
    if (lang === 'ru') translitTable = this.translitRU;
    else if (lang === 'uk') translitTable = this.translitUK;
    else if (lang === 'he') translitTable = this.translitHE;
    
    // Транслитерация
    let result = '';
    for (let char of text) {
      if (translitTable[char]) {
        result += translitTable[char];
      } else if (char.match(/[a-z0-9]/)) {
        result += char;
      } else if (char === ' ' || char === '-') {
        result += '-';
      }
      // Остальные символы игнорируем
    }
    
    // Очистка
    result = result
      .replace(/-+/g, '-')           // множественные дефисы → один
      .replace(/^-|-$/g, '')         // удаляем дефисы в начале/конце
      .substring(0, 60);             // ограничение длины
    
    // Валидация результата
    const validation = this.validateSlug(result);
    if (!validation.valid) {
      console.warn(`⚠️ Сгенерированный slug не прошёл валидацию: ${validation.error}`);
      return 'untitled';
    }
    
    return result || 'untitled';
  },

  /**
   * Проверяет уникальность slug в массиве стихов
   */
  isUnique(slug, poemId, poems) {
    return !poems.some(p => p.slug === slug && p.id !== poemId);
  },

  /**
   * Генерирует уникальный slug (добавляет -2, -3 и т.д. при конфликте)
   */
  generateUnique(title, lang, poemId, poems) {
    let baseSlug = this.generate(title, lang);
    let slug = baseSlug;
    let counter = 2;
    
    while (!this.isUnique(slug, poemId, poems)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  },

  /**
   * Автозаполнение всех пустых slug
   */
  fillAllEmpty(poems) {
    let filled = 0;
    
    poems.forEach(poem => {
      if (!poem.slug && poem.title) {
        poem.slug = this.generateUnique(poem.title, poem.lang, poem.id, poems);
        filled++;
      }
    });
    
    console.log(`✅ Сгенерировано slug для ${filled} стихов`);
    return filled;
  },

  /**
   * Пересоздание всех slug (даже существующих)
   */
  regenerateAll(poems) {
    poems.forEach(poem => {
      if (poem.title) {
        poem.slug = this.generateUnique(poem.title, poem.lang, poem.id, poems);
      }
    });
    
    console.log(`✅ Пересозданы все slug`);
  },

  /**
   * Поиск конфликтов slug
   */
  findConflicts(poems) {
    const slugMap = {};
    const conflicts = [];
    
    poems.forEach(poem => {
      if (!poem.slug) return;
      
      if (!slugMap[poem.slug]) {
        slugMap[poem.slug] = [];
      }
      slugMap[poem.slug].push(poem);
    });
    
    Object.entries(slugMap).forEach(([slug, poemsWithSlug]) => {
      if (poemsWithSlug.length > 1) {
        conflicts.push({
          slug,
          poems: poemsWithSlug
        });
      }
    });
    
    return conflicts;
  }
};