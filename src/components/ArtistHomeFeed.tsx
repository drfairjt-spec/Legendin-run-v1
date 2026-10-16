import React from "react";
import { User, Post, ColleagueMessage } from "../types";
import CommunityFeed from "./CommunityFeed";
import Leaderboard from "./Leaderboard";

interface ArtistHomeFeedProps {
  currentUser: User;
  posts: Post[];
  onUpdatePosts: (updatedPosts: Post[]) => void;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  colleagueMessages: ColleagueMessage[];
  onUpdateColleagueMessages: React.Dispatch<React.SetStateAction<ColleagueMessage[]>>;
  onChangeTab: (tab: any) => void;
}

export default function ArtistHomeFeed({
  currentUser,
  posts,
  onUpdatePosts,
  allUsers,
  onSelectUser,
  colleagueMessages,
  onUpdateColleagueMessages,
  onChangeTab
}: ArtistHomeFeedProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Community Feed Component */}
      <CommunityFeed
        currentUser={currentUser}
        posts={posts}
        onUpdatePosts={onUpdatePosts}
        allUsers={allUsers}
        onSelectUser={onSelectUser}
        colleagueMessages={colleagueMessages}
        onUpdateColleagueMessages={onUpdateColleagueMessages}
      />

      {/* 2. Leaderboard Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-xs sm:text-sm font-black text-slate-800">برترین‌های این ماه</h3>
          <p className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold mt-0.5">آرتیست‌های دارای قوی‌ترین رزومه و بیشترین میزان رضایت در لجندین</p>
        </div>
        
        <Leaderboard
          allUsers={allUsers}
          onSelectArtist={onSelectUser}
          onChangeTab={onChangeTab}
        />
      </div>

    </div>
  );
}
