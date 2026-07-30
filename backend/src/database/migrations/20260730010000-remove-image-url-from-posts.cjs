'use strict';

function escapeAttribute(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function embedImage(content, imageUrl, title) {
  const currentContent = String(content ?? '');
  if (/<img\b[^>]*\bsrc\s*=/i.test(currentContent)) return currentContent;
  const figure = `<figure><img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(title)}" loading="lazy"></figure>`;
  const introEnd = currentContent.search(/<\/p\s*>/i);
  return introEnd >= 0
    ? `${currentContent.slice(0, introEnd + 4)}${figure}${currentContent.slice(introEnd + 4)}`
    : `${currentContent}${figure}`;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('posts');
    if (columns.image_url) {
      const translations = await queryInterface.sequelize.query(
        `SELECT pt.id, pt.title, pt.content, p.image_url
         FROM post_translations pt
         INNER JOIN posts p ON p.id = pt.post_id
         WHERE p.image_url IS NOT NULL AND p.image_url <> ''`,
        { type: Sequelize.QueryTypes.SELECT },
      );
      for (const translation of translations) {
        const content = embedImage(
          translation.content,
          translation.image_url,
          translation.title,
        );
        if (content !== translation.content) {
          await queryInterface.bulkUpdate(
            'post_translations',
            { content },
            { id: translation.id },
          );
        }
      }
      await queryInterface.removeColumn('posts', 'image_url');
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('posts');
    if (!columns.image_url) {
      await queryInterface.addColumn('posts', 'image_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
      const translations = await queryInterface.sequelize.query(
        `SELECT post_id, content
         FROM post_translations
         ORDER BY post_id, language_id`,
        { type: Sequelize.QueryTypes.SELECT },
      );
      const restoredPosts = new Set();
      for (const translation of translations) {
        if (restoredPosts.has(translation.post_id)) continue;
        const match = String(translation.content ?? '').match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
        if (!match?.[1]) continue;
        await queryInterface.bulkUpdate(
          'posts',
          { image_url: match[1] },
          { id: translation.post_id },
        );
        restoredPosts.add(translation.post_id);
      }
    }
  },
};
