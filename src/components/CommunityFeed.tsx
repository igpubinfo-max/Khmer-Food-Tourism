import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Heart, MessageCircle, Share2, MapPin, Tag, 
  Send, Trash2, Plus, ShieldCheck, Store
} from 'lucide-react';
import { CreatePostModal } from './CreatePostModal';

export const CommunityFeed: React.FC = () => {
  const { 
    posts, toggleLikePost, addComment, deletePost, 
    currentUser, language, setIsAddPostModalOpen, showToast 
  } = useApp();

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    addComment(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleShareTelegram = (title: string, desc: string) => {
    const text = encodeURIComponent(`Khmer Food & Tourism Community:\n${title}\n${desc}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast(language === 'km' ? 'បានចម្លងតំណភ្ជាប់!' : 'Link copied!', 'success');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* Top Banner & Post creator trigger */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#0B3D2E] via-[#14532D] to-[#0B3D2E] text-white shadow-md flex items-center justify-between border border-[#A7DCA5]/30">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-[#A7DCA5]">
            {language === 'km' ? 'សហគមន៍ចែករំលែក' : 'Community Feed'}
          </h2>
          <p className="text-[11px] text-[#A7DCA5]/80 mt-0.5">
            {language === 'km' ? 'ចែករំលែកម្ហូបឆ្ងាញ់ រូបមន្ត និងកន្លែងកម្សាន្ត' : 'Share delicious food, recipes & travel'}
          </p>
        </div>

        <button
          onClick={() => setIsAddPostModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#34A853] hover:bg-[#228B4E] text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'km' ? 'បង្ហោះ' : 'Post'}</span>
        </button>
      </div>

      {/* Feed list */}
      <div className="space-y-4">
        {posts.map((post) => {
          const isLiked = currentUser ? post.likedByUserIds.includes(currentUser.id) : false;
          const isCommentOpen = activeCommentPostId === post.id;
          const isAuthor = currentUser?.id === post.authorId || currentUser?.role === 'admin';

          return (
            <article 
              key={post.id}
              className="bg-white dark:bg-[#0B3D2E] rounded-3xl overflow-hidden shadow-xs border border-[#A7DCA5]/40 dark:border-[#228B4E]/30"
            >
              {/* Post Author Bar */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={post.authorAvatar} 
                    alt={post.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-[#A7DCA5] shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-[#183326] dark:text-stone-100">
                        {post.authorName}
                      </h4>
                      {post.authorRole === 'admin' && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-red-100 text-red-700 text-[9px] font-bold">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                      {post.authorRole === 'owner' && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-[#EAF6EC] text-[#14532D] text-[9px] font-bold">
                          <Store className="w-2.5 h-2.5 text-[#228B4E]" />
                          {language === 'km' ? 'ម្ចាស់ហាង' : 'Owner'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <span>{post.createdAt}</span>
                      {post.locationName && (
                        <span className="flex items-center gap-0.5 text-stone-500">
                          <MapPin className="w-2.5 h-2.5 text-rose-500" />
                          {post.locationName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isAuthor && (
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-500 rounded-full transition"
                    title="លុបការបង្ហោះ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Title & Tag */}
              <div className="px-3.5 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF6EC] dark:bg-[#14532D]/40 text-[#14532D] dark:text-[#A7DCA5] text-[10px] font-bold border border-[#A7DCA5]/30">
                    <Tag className="w-2.5 h-2.5 text-[#34A853]" />
                    {post.categoryTag}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#183326] dark:text-stone-100">
                  {post.titleKh}
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed whitespace-pre-line">
                  {post.descriptionKh}
                </p>
              </div>

              {/* Post Photo */}
              {post.photoUrl && (
                <div className="relative aspect-4/3 w-full bg-[#EAF6EC]/50 dark:bg-stone-800 overflow-hidden">
                  <img 
                    src={post.photoUrl} 
                    alt={post.titleKh}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Interaction Bar: Like, Comment, Share */}
              <div className="p-3 border-t border-[#A7DCA5]/20 dark:border-[#228B4E]/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={() => toggleLikePost(post.id)}
                    className={`flex items-center gap-1.5 font-bold transition active:scale-90 ${
                      isLiked ? 'text-rose-600' : 'text-stone-500 hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-[#14532D] dark:hover:text-[#A7DCA5] font-semibold transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments.length}</span>
                  </button>
                </div>

                {/* Share dropdown / icons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleShareTelegram(post.titleKh, post.descriptionKh)}
                    className="p-1.5 rounded-full bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 transition"
                    title="Share to Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleShareFacebook}
                    className="p-1.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition"
                    title="Share to Facebook"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="px-2 py-1 rounded-lg bg-[#EAF6EC] dark:bg-[#14532D]/40 text-[#14532D] dark:text-[#A7DCA5] text-[10px] font-semibold"
                  >
                    {language === 'km' ? 'ចម្លង' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {isCommentOpen && (
                <div className="px-3.5 pb-3.5 pt-1 bg-[#EAF6EC]/40 dark:bg-stone-800/40 border-t border-[#A7DCA5]/20 dark:border-[#228B4E]/20 animate-in fade-in duration-150">
                  {/* Comments list */}
                  <div className="space-y-2 mb-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {post.comments.length === 0 ? (
                      <p className="text-center text-[11px] text-stone-400 py-2">
                        {language === 'km' ? 'មិនទាន់មានមតិយោបល់នៅឡើយទេ' : 'No comments yet'}
                      </p>
                    ) : (
                      post.comments.map((cm) => (
                        <div key={cm.id} className="flex items-start gap-2 bg-white dark:bg-stone-800 p-2 rounded-xl border border-[#A7DCA5]/20 text-xs">
                          <img 
                            src={cm.authorAvatar} 
                            alt={cm.authorName} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-[#183326] dark:text-stone-200">
                                {cm.authorName}
                              </span>
                              <span className="text-[9px] text-stone-400">{cm.createdAt}</span>
                            </div>
                            <p className="text-stone-600 dark:text-stone-300 text-[11px] mt-0.5">
                              {cm.text}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendComment(post.id);
                      }}
                      placeholder={language === 'km' ? 'សរសេរមតិយោបល់...' : 'Write a comment...'}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[#A7DCA5]/40 bg-white dark:bg-stone-800 text-xs focus:outline-none focus:border-[#34A853]"
                    />
                    <button
                      onClick={() => handleSendComment(post.id)}
                      className="p-2 rounded-xl bg-[#14532D] hover:bg-[#0B3D2E] text-white shadow-2xs transition active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <CreatePostModal />
    </div>
  );
};
