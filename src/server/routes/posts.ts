// src/server/routes/posts.ts
import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.ts';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/posts
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    // Handle pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const before = req.query.before as string;

    let query = `
      SELECT * FROM posts
    `;
    const params: any[] = [];

    if (before) {
      query += ` WHERE created_at < ? `;
      params.push(before);
    }

    query += ` ORDER BY created_at DESC LIMIT ? `;
    params.push(limit);

    const posts = db.prepare(query).all(...params);

    // Get all unique author IDs from posts
    const authorIds = [...new Set(posts.map((post: any) => post.author_id))];

    // Load users for all authors
    const usersMap = new Map();
    if (authorIds.length > 0) {
      const placeholders = authorIds.map(() => '?').join(', ');
      const users = db.prepare(`SELECT id, name, avatar, role FROM users WHERE id IN (${placeholders})`).all(...authorIds);
      users.forEach((user: any) => {
        usersMap.set(user.id, {
          name: user.name,
          avatar: user.avatar,
          role: user.role
        });
      });
    }

    // Load comments for all posts
    const commentsMap = new Map();
    const postIds = posts.map((post: any) => post.id);
    if (postIds.length > 0) {
      const placeholders = postIds.map(() => '?').join(', ');
      const comments = db.prepare(`SELECT * FROM comments WHERE post_id IN (${placeholders})`).all(...postIds);

      // Get authors for comments
      const commentAuthorIds = [...new Set(comments.map((comment: any) => comment.author_id))];
      if (commentAuthorIds.length > 0) {
        const commentPlaceholders = commentAuthorIds.map(() => '?').join(', ');
        const commentAuthors = db.prepare(`SELECT id, name, avatar, role FROM users WHERE id IN (${commentPlaceholders})`).all(...commentAuthorIds);
        commentAuthors.forEach((author: any) => {
          usersMap.set(author.id, {
            name: author.name,
            avatar: author.avatar,
            role: author.role
          });
        });
      }

      // Group comments by post ID
      comments.forEach((comment: any) => {
        if (!commentsMap.has(comment.post_id)) {
          commentsMap.set(comment.post_id, []);
        }

        const commentAuthor = usersMap.get(comment.author_id) || {
          name: 'کاربر لجندین',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
          role: 'client'
        };

        commentsMap.get(comment.post_id).push({
          id: comment.id,
          authorId: comment.author_id,
          authorName: commentAuthor.name,
          authorAvatar: commentAuthor.avatar,
          authorRole: commentAuthor.role,
          content: comment.content,
          createdAt: comment.created_at,
          likesCount: 0,
          likedBy: []
        });
      });
    }

    // Format posts with author info and comments
    const formattedPosts = posts.map((post: any) => {
      const author = usersMap.get(post.author_id) || {
        name: 'کاربر لجندین',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        role: 'client'
      };

      return {
        id: post.id,
        authorId: post.author_id,
        authorName: author.name,
        authorAvatar: author.avatar,
        authorRole: author.role,
        content: post.content,
        image: post.image,
        tag: post.tag,
        likesCount: post.likes_count,
        likedBy: JSON.parse(post.liked_by_json || '[]'),
        createdAt: post.created_at,
        comments: commentsMap.get(post.id) || []
      };
    });

    res.json(formattedPosts);
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'خطا در بارگذاری پست‌ها.' });
  }
});

// GET /api/posts/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'پست یافت نشد.' });
    }

    // Get author info
    const author = db.prepare('SELECT name, avatar, role FROM users WHERE id = ?').get(post.author_id) || {
      name: 'کاربر لجندین',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      role: 'client'
    };

    // Get comments
    const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(postId).map((c: any) => {
      const commentAuthor = db.prepare('SELECT name, avatar, role FROM users WHERE id = ?').get(c.author_id) || {
        name: 'کاربر لجندین',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
        role: 'client'
      };

      return {
        id: c.id,
        authorId: c.author_id,
        authorName: commentAuthor.name,
        authorAvatar: commentAuthor.avatar,
        authorRole: commentAuthor.role,
        content: c.content,
        createdAt: c.created_at,
        likesCount: 0,
        likedBy: []
      };
    });

    res.json({
      id: post.id,
      authorId: post.author_id,
      authorName: author.name,
      authorAvatar: author.avatar,
      authorRole: author.role,
      content: post.content,
      image: post.image,
      tag: post.tag,
      likesCount: post.likes_count,
      likedBy: JSON.parse(post.liked_by_json || '[]'),
      createdAt: post.created_at,
      comments
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'خطا در بارگذاری پست.' });
  }
});

// POST /api/posts
router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { content, image, tag } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'لطفاً محتوا را وارد کنید.' });
    }

    // Validate content length
    if (typeof content !== 'string' || content.length > 2000) {
      return res.status(400).json({ error: 'محتوا نباید بیش از ۲۰۰۰ کاراکتر باشد.' });
    }

    // Validate image path
    if (image && (typeof image !== 'string' || !image.startsWith('/uploads/'))) {
      return res.status(400).json({ error: 'مسیر تصویر نامعتبر است.' });
    }

    // Validate tag length
    if (tag && (typeof tag !== 'string' || tag.length > 30)) {
      return res.status(400).json({ error: 'تگ نباید بیش از ۳۰ کاراکتر باشد.' });
    }

    const postId = 'post-' + randomUUID();

    const stmt = db.prepare(`
      INSERT INTO posts (id, author_id, content, image, tag, created_at, likes_count, liked_by_json)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 0, '[]')
    `);

    stmt.run(
      postId,
      user.id,
      content,
      image || null,
      tag || null
    );

    const newPost = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    res.status(201).json({
      id: newPost.id,
      authorId: newPost.author_id,
      authorName: user.name,
      authorAvatar: user.avatar,
      authorRole: user.role,
      content: newPost.content,
      image: newPost.image,
      tag: newPost.tag,
      likesCount: newPost.likes_count,
      likedBy: JSON.parse(newPost.liked_by_json || '[]'),
      createdAt: newPost.created_at,
      comments: []
    });
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'خطا در ثبت پست.' });
  }
});

// UPDATE /api/posts/:id/likes
router.patch('/:id/likes', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { likedBy } = req.body;

    if (!Array.isArray(likedBy)) {
      return res.status(400).json({ error: 'لایک‌های ارسال شده نامعتبر هستند.' });
    }

    const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'پست یافت نشد.' });
    }

    db.prepare('UPDATE posts SET liked_by_json = ? WHERE id = ?').run(
      JSON.stringify(likedBy),
      postId
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating post likes:', error);
    res.status(500).json({ error: 'خطا در به‌روزرسانی لایک‌های پست.' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) {
      return res.status(404).json({ error: 'پست یافت نشد.' });
    }

    // Only allow deletion by the author
    const user = req.user!;
    if (post.author_id !== user.id) {
      return res.status(403).json({ error: 'شما فقط می‌توانید پست‌های خودتان را حذف کنید.' });
    }

    db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ message: 'پست با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'خطا در حذف پست.' });
  }
});

export default router;