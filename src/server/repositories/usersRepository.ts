// src/server/repositories/usersRepository.ts
import { db } from '../db.ts';
import { User } from '../../types';

export class UsersRepository {
  // Get all users with portfolio and reviews
  static async findAll(): Promise<User[]> {
    const users = db.prepare('SELECT * FROM users').all() as any[];

    // Load portfolio items for all users
    const portfolioMap = new Map<string, any[]>();
    db.prepare('SELECT * FROM portfolio_items').all().forEach((item: any) => {
      if (!portfolioMap.has(item.user_id)) {
        portfolioMap.set(item.user_id, []);
      }
      portfolioMap.get(item.user_id).push({
        id: item.id,
        imageUrl: item.image_url,
        url: item.image_url,
        title: item.title,
        description: item.description
      });
    });

    // Load reviews for all users
    const reviewsMap = new Map<string, any[]>();
    db.prepare('SELECT * FROM reviews').all().forEach((review: any) => {
      if (!reviewsMap.has(review.user_id)) {
        reviewsMap.set(review.user_id, []);
      }
      reviewsMap.get(review.user_id).push({
        id: review.id,
        reviewerName: review.reviewer_name,
        reviewerAvatar: review.reviewer_avatar,
        rating: review.rating,
        comment: review.comment,
        date: review.created_at
      });
    });

    return users.map((user: any) => {
      const portfolio = portfolioMap.get(user.id) || [];
      const reviews = reviewsMap.get(user.id) || [];

      let skills = [];
      try {
        skills = JSON.parse(user.skills_json || '[]');
      } catch {
        skills = [];
      }

      let certifications = [];
      try {
        certifications = JSON.parse(user.certifications_json || '[]');
      } catch {
        certifications = [];
      }

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        coverImage: user.cover_image,
        title: user.title,
        city: user.city,
        bio: user.bio,
        resumeText: user.resume_text,
        skills,
        certifications,
        portfolio,
        reviews,
        openForHiring: Boolean(user.open_for_hiring),
        acceptingRequests: Boolean(user.accepting_requests),
        salonName: user.salon_name,
        salonLocation: user.salon_location,
        salonDescription: user.salon_description,
        contract: user.contract_type ? {
          contractType: user.contract_type,
          type: user.contract_type,
          startDate: user.contract_start_date,
          endDate: user.contract_end_date,
          amount: user.contract_amount,
          contractFileUrl: user.contract_file_url,
          guaranteeType: user.guarantee_type,
          guaranteeFileUrl: user.guarantee_file_url
        } : undefined
      };
    });
  }

  // Get user by ID with portfolio and reviews
  static async findById(id: string): Promise<User | null> {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

    if (!user) return null;

    const portfolio = db.prepare('SELECT * FROM portfolio_items WHERE user_id = ?').all(user.id).map((p: any) => ({
      id: p.id,
      imageUrl: p.image_url,
      url: p.image_url,
      title: p.title,
      description: p.description
    }));

    const reviews = db.prepare('SELECT * FROM reviews WHERE user_id = ?').all(user.id).map((r: any) => ({
      id: r.id,
      reviewerName: r.reviewer_name,
      reviewerAvatar: r.reviewer_avatar,
      rating: r.rating,
      comment: r.comment,
      date: r.created_at
    }));

    let skills = [];
    try {
      skills = JSON.parse(user.skills_json || '[]');
    } catch {
      skills = [];
    }

    let certifications = [];
    try {
      certifications = JSON.parse(user.certifications_json || '[]');
    } catch {
      certifications = [];
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      coverImage: user.cover_image,
      title: user.title,
      city: user.city,
      bio: user.bio,
      resumeText: user.resume_text,
      skills,
      certifications,
      portfolio,
      reviews,
      openForHiring: Boolean(user.open_for_hiring),
      acceptingRequests: Boolean(user.accepting_requests),
      salonName: user.salon_name,
      salonLocation: user.salon_location,
      salonDescription: user.salon_description,
      contract: user.contract_type ? {
        contractType: user.contract_type,
        startDate: user.contract_start_date,
        endDate: user.contract_end_date,
        amount: user.contract_amount,
        contractFileUrl: user.contract_file_url,
        guaranteeType: user.guarantee_type,
        guaranteeFileUrl: user.guarantee_file_url
      } : undefined
    };
  }
}