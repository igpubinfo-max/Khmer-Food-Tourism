import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Heart, MessageCircle, Share2, MapPin, Tag, 
  Send, Trash2, Plus, ShieldCheck, Store
} from 'lucide-react';
import { CreatePostModal } from './CreatePostModal';
import {
  shareRichContent,
  formatRichShareText,
  copyTextNativeOrWeb,
} from '../utils/androidMediaHelper';

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

  const handleShareNative = (post: { id: string; titleKh: string; descriptionKh: string; photoUrl?: string; locationName?: string }) => {
    shareRichContent(
      {
        title: post.titleKh,
        nameKh: post.titleKh,
        description: post.descriptionKh,
        location: post.locationName || (language === 'km' ? 'កម្ពុជា' : 'Cambodia'),
        photoUrl: post.photoUrl,
        itemType: 'post',
        itemId: post.id,
        isKm: language === 'km',
      },
      showToast
    );
  };

  const handleShareTelegram = (title: string, desc: string, locationName?: string, postId?: string) => {
    const { fullText, directLink } = formatRichShareText({
      title,
      nameKh: title,
      description: desc,
      location: locationName,
      itemType: 'post',
      itemId: postId,
      isKm: language === 'km',
    });
    const text = encodeURIComponent(fullText);
    const url = encodeURIComponent(directLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const handleShareFacebook = (title?: string, desc?: string, locationName?: string, postId?: string) => {
    const { fullText, directLink } = formatRichShareText({
      title: title || 'Khmer Food & Tourism',
      nameKh: title,
      description: desc,
      location: locationName,
      itemType: 'post',
      itemId: postId,
      isKm: language === 'km',
    });
    const url = encodeURIComponent(directLink);
    const quote = encodeURIComponent(fullText);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  };

  const handleCopyLink = async (title?: string, desc?: string, locationName?: string, postId?: string) => {
    const { fullText } = formatRichShareText({
      title: title || 'Khmer Food & Tourism',
      nameKh: title,
      description: desc,
      location: locationName,
      itemType: 'post',
      itemId: postId,
      isKm: language === 'km',
    });
    const ok = await copyTextNativeOrWeb(fullText, title || 'Khmer Food & Tourism');
    if (ok) {
      showToast(language === 'km' ? 'បានចម្លងព័ត៌មាន និងតំណភ្ជាប់!' : 'Post details & link copied!', 'success');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4 pb-20">
      {/* Top Banner & Post creator trigger */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[#064E3B] via-[#065F46] to-[#047857] text-white shadow-xs flex items-center justify-between border border-emerald-600/30">
        <div>
          <h2 className="font-moul text-sm sm:text-base text-white">
            {language === 'km' ? 'សហគមន៍ចែករំលែក' : 'Community Feed'}
          </h2>
          <p className="text-[11px] text-emerald-100 mt-0.5">
            {language === 'km' ? 'ចែករំលែកម្ហូបឆ្ងាញ់ រូបមន្ត និងកន្លែងកម្សាន្ត' : 'Share delicious food, recipes & travel'}
          </p>
        </div>

        <button
          onClick={() => setIsAddPostModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'km' ? 'បង្ហោះ' : 'Post'}</span>
        </button>
      </div>

      {/* Feed list */}
      <div className="space-y-4">
        {posts.map((post) => {
          const isLiked = currentUser ? (post.likedByUserIds || []).includes(currentUser.id) : false;
          const isCommentOpen = activeCommentPostId === post.id;
          const isAuthor = currentUser?.id === post.authorId || currentUser?.role === 'admin';

          return (
            <article 
              key={post.id}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xs border border-slate-200/90 dark:border-slate-700/80"
            >
              {/* Post Author Bar */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img 
                    src={post.authorAvatar} 
                    alt={post.authorName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-xs text-[#0F172A] dark:text-white">
                        {post.authorName}
                      </h4>
                      {post.authorRole === 'admin' && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                      {post.authorRole === 'owner' && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-50 text-[#064E3B] border border-emerald-200 text-[9px] font-bold">
                          <Store className="w-2.5 h-2.5 text-[#059669]" />
                          {language === 'km' ? 'ម្ចាស់ហាង' : 'Owner'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{post.createdAt}</span>
                      {post.locationName && (
                        <span className="flex items-center gap-0.5 text-slate-500">
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
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full transition"
                    title="លុបការបង្ហោះ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Title & Tag */}
              <div className="px-3.5 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <Tag className="w-2.5 h-2.5 text-[#059669]" />
                    {post.categoryTag}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#0F172A] dark:text-white">
                  {post.titleKh}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                  {post.descriptionKh}
                </p>
              </div>

              {/* Post Photo */}
              {post.photoUrl && (
                <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <img 
                    src={post.photoUrl} 
                    alt={post.titleKh}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Interaction Bar: Like, Comment, Share */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {/* Like Button */}
                  <button
                    onClick={() => toggleLikePost(post.id)}
                    className={`flex items-center gap-1.5 font-bold transition active:scale-90 ${
                      isLiked ? 'text-rose-600' : 'text-slate-500 hover:text-rose-500'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{post.likesCount ?? 0}</span>
                  </button>

                  {/* Comment Toggle */}
                  <button
                    onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-[#064E3B] dark:hover:text-emerald-400 font-semibold transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{(post.comments || []).length}</span>
                  </button>
                </div>

                {/* Share dropdown / icons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleShareNative(post)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#064E3B] hover:bg-[#047857] text-white text-[10px] font-bold shadow-2xs transition active:scale-95"
                    title={language === 'km' ? 'ចែករំលែកការបង្ហោះ' : 'Share post'}
                  >
                    <Share2 className="w-3 h-3" />
                    <span>{language === 'km' ? 'ចែករំលែក' : 'Share'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareTelegram(post.titleKh, post.descriptionKh, post.locationName, post.id)}
                    className="p-1.5 rounded-full bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 transition"
                    title="Share to Telegram"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareFacebook(post.titleKh, post.descriptionKh, post.locationName, post.id)}
                    className="p-1.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition"
                    title="Share to Facebook"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(post.titleKh, post.descriptionKh, post.locationName, post.id)}
                    className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                  >
                    {language === 'km' ? 'ចម្លង' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {isCommentOpen && (
                <div className="px-3.5 pb-3.5 pt-1 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-700 animate-in fade-in duration-150">
                  {/* Comments list */}
                  <div className="space-y-2 mb-2.5 max-h-48 overflow-y-auto no-scrollbar">
                    {(post.comments || []).length === 0 ? (
                      <p className="text-center text-[11px] text-slate-400 py-2">
                        {language === 'km' ? 'មិនទាន់មានមតិយោបល់នៅឡើយទេ' : 'No comments yet'}
                      </p>
                    ) : (
                      (post.comments || []).map((cm) => (
                        <div key={cm.id} className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 text-xs">
                          <img 
                            src={cm.authorAvatar} 
                            alt={cm.authorName} 
                            className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[11px] text-[#0F172A] dark:text-slate-200">
                                {cm.authorName}
                              </span>
                              <span className="text-[9px] text-slate-400">{cm.createdAt}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
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
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-[#059669]"
                    />
                    <button
                      onClick={() => handleSendComment(post.id)}
                      className="p-2 rounded-xl bg-[#064E3B] hover:bg-[#047857] text-white shadow-2xs transition active:scale-95"
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
