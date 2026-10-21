// ============================================
// collectionManager.js — Управление коллекциями
// ============================================

const CollectionManager = {
  
  /**
   * Получить список всех уникальных коллекций
   */
  getAllCollections() {
    if (!Editor.data || !Editor.data.poetry) return [];
    
    const collections = [...new Set(
      Editor.data.poetry
        .map(p => p.collection)
        .filter(Boolean)
    )].sort();
    
    return collections;
  },

  /**
   * Получить статистику по коллекции
   */
  getCollectionStats(collectionName) {
    if (!Editor.data || !Editor.data.poetry) return null;
    
    const poems = Editor.data.poetry.filter(p => p.collection === collectionName);
    
    const byLang = {};
    poems.forEach(p => {
      if (!byLang[p.lang]) byLang[p.lang] = 0;
      byLang[p.lang]++;
    });
    
    const withSlug = poems.filter(p => p.slug).length;
    const withTranslations = poems.filter(p => p.translations && p.translations.length > 0).length;
    
    return {
      name: collectionName,
      totalPoems: poems.length,
      byLanguage: byLang,
      withSlug,
      withTranslations,
      poems
    };
  },

  /**
   * Переименовать коллекцию
   */
  renameCollection(oldName, newName) {
    if (!oldName || !newName) {
      alert('Название коллекции не может быть пустым');
      return false;
    }
    
    if (oldName === newName) {
      alert('Новое название совпадает со старым');
      return false;
    }
    
    // Проверка существования новой коллекции
    const existing = this.getAllCollections();
    if (existing.includes(newName)) {
      if (!confirm(`Коллекция "${newName}" уже существует. Объединить стихи из "${oldName}" в "${newName}"?`)) {
        return false;
      }
    }
    
    let renamed = 0;
    Editor.data.poetry.forEach(poem => {
      if (poem.collection === oldName) {
        poem.collection = newName;
        renamed++;
      }
    });
    
    Editor.isDirty = true;
    console.log(`✅ Переименовано: "${oldName}" → "${newName}" (${renamed} стихов)`);
    
    return renamed;
  },

  /**
   * Удалить коллекцию (стихи остаются, но без коллекции)
   */
  removeCollection(collectionName) {
    if (!collectionName) return 0;
    
    let removed = 0;
    Editor.data.poetry.forEach(poem => {
      if (poem.collection === collectionName) {
        poem.collection = '';
        removed++;
      }
    });
    
    Editor.isDirty = true;
    console.log(`🗑️ Коллекция удалена: "${collectionName}" (${removed} стихов остались без коллекции)`);
    
    return removed;
  },

  /**
   * Генерация slug для всех стихов в коллекции
   */
  generateSlugsForCollection(collectionName, regenerate = false) {
    if (!Editor.data || !Editor.data.poetry) return 0;
    
    const poems = Editor.data.poetry.filter(p => p.collection === collectionName);
    let generated = 0;
    
    poems.forEach(poem => {
      if (!poem.slug || regenerate) {
        poem.slug = SlugHelper.generateUnique(poem.title, poem.lang, poem.id, Editor.data.poetry);
        generated++;
      }
    });
    
    Editor.isDirty = true;
    console.log(`✅ Сгенерировано slug для ${generated} стихов в коллекции "${collectionName}"`);
    
    return generated;
  },

  /**
   * Рендер интерфейса управления коллекциями
   */
  render() {
    const container = document.getElementById('collectionsContent');
    if (!container) return;
    
    const collections = this.getAllCollections();
    
    container.innerHTML = `
      <div class="card">
        <h3>📚 Управление коллекциями</h3>
        <p style="color:#666; font-size:13px;">Всего коллекций: ${collections.length}</p>
        
        <div style="margin: 20px 0;">
          <button class="btn-load" onclick="CollectionManager.showCreateForm()">➕ Создать коллекцию</button>
        </div>
      </div>
      
      <div id="collectionsList"></div>
    `;
    
    this.renderCollectionsList(collections);
  },

  renderCollectionsList(collections) {
    const listContainer = document.getElementById('collectionsList');
    if (!listContainer) return;
    
    if (collections.length === 0) {
      listContainer.innerHTML = '<div class="card"><p style="text-align:center; color:#999;">Коллекций нет</p></div>';
      return;
    }
    
    let html = '';
    
    collections.forEach(collName => {
      const stats = this.getCollectionStats(collName);
      
      const langBadges = Object.entries(stats.byLanguage)
        .map(([lang, count]) => `<span class="badge badge-${lang}">${lang.toUpperCase()}: ${count}</span>`)
        .join(' ');
      
      html += `
        <div class="card" style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0;">${collName}</h4>
              <div style="margin-bottom: 10px;">
                ${langBadges}
              </div>
              <div style="font-size: 13px; color: #666;">
                📖 Стихов: ${stats.totalPoems} | 
                🔗 С slug: ${stats.withSlug} | 
                🌐 С переводами: ${stats.withTranslations}
              </div>
            </div>
            
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              <button class="btn-secondary" onclick="CollectionManager.showRenameForm('${collName}')" style="font-size:12px; padding:4px 8px;">✏️ Переименовать</button>
              <button class="btn-load" onclick="CollectionManager.generateSlugsForCollection('${collName}')" style="font-size:12px; padding:4px 8px;">🔤 Slug для всех</button>
              <button class="btn-danger" onclick="CollectionManager.confirmRemove('${collName}')" style="font-size:12px; padding:4px 8px;">🗑️ Удалить</button>
            </div>
          </div>
        </div>
      `;
    });
    
    listContainer.innerHTML = html;
  },

  showCreateForm() {
    const name = prompt('Введите название новой коллекции:');
    if (!name) return;
    
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Название не может быть пустым');
      return;
    }
    
    const existing = this.getAllCollections();
    if (existing.includes(trimmed)) {
      alert(`Коллекция "${trimmed}" уже существует`);
      return;
    }
    
    alert(`Коллекция "${trimmed}" будет создана при добавлении в неё первого стиха`);
  },

  showRenameForm(oldName) {
    const newName = prompt(`Переименовать коллекцию "${oldName}" в:`, oldName);
    if (!newName) return;
    
    const renamed = this.renameCollection(oldName, newName.trim());
    if (renamed) {
      Editor.renderAll();
      alert(`✅ Переименовано ${renamed} стихов`);
    }
  },

  confirmRemove(collectionName) {
    const stats = this.getCollectionStats(collectionName);
    
    if (!confirm(
      `Удалить коллекцию "${collectionName}"?\n\n` +
      `${stats.totalPoems} стихов останутся в базе, но без коллекции.\n` +
      `Это действие можно отменить, не сохраняя файл.`
    )) return;
    
    const removed = this.removeCollection(collectionName);
    Editor.renderAll();
    alert(`✅ Коллекция удалена. ${removed} стихов остались без коллекции`);
  },

  generateSlugsForCollectionWithConfirm(collectionName) {
    const stats = this.getCollectionStats(collectionName);
    const withoutSlug = stats.totalPoems - stats.withSlug;
    
    if (withoutSlug === 0) {
      alert('Все стихи в этой коллекции уже имеют slug');
      return;
    }
    
    if (confirm(
      `Сгенерировать slug для ${withoutSlug} стихов в коллекции "${collectionName}"?\n\n` +
      `Стихи с существующими slug не будут изменены.`
    )) {
      const generated = this.generateSlugsForCollection(collectionName, false);
      Editor.renderAll();
      alert(`✅ Сгенерировано ${generated} slug`);
    }
  }
};