// src/server/repositories/postsRepository.ts
import { db } from '../db.ts';

export class PostsRepository {
  // Get all posts with authors and comments
  static async findAll(): Promise<any[]> {
    const posts = db.prepare('SELECT * FROM posts').all() as any[];

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
    return posts.map((post: any) => {
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
  }

  // Get post by ID with author and comments
  static async findById(id: string): Promise<any | null> {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
    if (!post) return null;

    // Get author info
    const author = db.prepare('SELECT name, avatar, role FROM users WHERE id = ?').get(post.author_id) || {
      name: 'کاربر لجندین',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      role: 'client'
    };

    // Get comments
    const comments = db.prepare('SELECT * FROM comments WHERE post_id = ?').all(id).map((c: any) => {
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
      comments
    };
  }

  // Create new post
  static async create(postData: {
    id: string;
    author_id: string;
    content: string;
    image?: string;
    tag?: string;
  }): Promise<any> {
    const { id, author_id, content, image, tag } = postData;

    const stmt = db.prepare(`
      INSERT INTO posts (id, author_id, content, image, tag, created_at, likes_count, liked_by_json)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 0, '[]')
    `);

    stmt.run(id, author_id, content, image || null, tag || null);

    return this.findById(id);
  }

  // Update post likes
  static async updateLikes(postId: string, likedBy: string[]): Promise<void> {
    db.prepare('UPDATE posts SET liked_by_json = ? WHERE id = ?').run(
      JSON.stringify(likedBy),
      postId
    );
  }

  // Delete post
  static async delete(id: string): Promise<void> {
    db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  }
}