import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin,
  Calendar,
  Heart,
  MessageCircle,
  Plus,
  Image as ImageIcon,
  User,
  Loader2,
  Share2,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Post {
  id: string;
  user_id: string;
  trip_id: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  caption: string | null;
  created_at: string;

  trips?: {
    destination: string;
    start_date: string;
    end_date: string;
  } | null;

  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;

  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [likes, setLikes] = useState<Record<string, number>>({});
  const [likedPosts, setLikedPosts] =
    useState<Record<string, boolean>>({});

  const [comments, setComments] =
    useState<Record<string, Comment[]>>({});

  const [commentText, setCommentText] =
    useState<Record<string, string>>({});

  const [openComments, setOpenComments] =
    useState<Record<string, boolean>>({});

  const [postingComment, setPostingComment] =
    useState<Record<string, boolean>>({});

  const [currentImage, setCurrentImage] =
    useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchTravelFeed();
    }
  }, [user]);

  // =====================================================
  // FETCH TRAVEL FEED
  // =====================================================

  const fetchTravelFeed = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('travel_posts')
        .select(`
          id,
          user_id,
          trip_id,
          image_url,
          image_urls,
          caption,
          created_at,
          trips (
            destination,
            start_date,
            end_date
          )
        `)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        console.error(
          'Travel feed error:',
          error
        );

        setPosts([]);
        return;
      }

      if (!data || data.length === 0) {
        setPosts([]);
        return;
      }

      // =================================================
      // GET USER IDS
      // =================================================

      const userIds = Array.from(
        new Set(
          data
            .map((post: any) => post.user_id)
            .filter(Boolean)
        )
      );

      // =================================================
      // FETCH PROFILES
      // IMPORTANT:
      // profiles table has:
      // id
      // full_name
      // avatar_url
      //
      // NO username
      // =================================================

      let profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const {
          data: profilesData,
          error: profilesError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url
          `)
          .in('id', userIds);

        if (profilesError) {
          console.error(
            'Profiles fetch error:',
            profilesError
          );
        } else {
          profilesMap = (
            profilesData || []
          ).reduce(
            (
              acc: Record<string, any>,
              item: any
            ) => {
              acc[item.id] = item;
              return acc;
            },
            {}
          );
        }
      }

      // =================================================
      // COMBINE POST + PROFILE
      // =================================================

      const formattedPosts: Post[] =
        data.map((post: any) => ({
          ...post,

          profile:
            profilesMap[post.user_id] || null,
        }));

      console.log(
        'TRAVEL POSTS:',
        formattedPosts
      );

      setPosts(formattedPosts);

      await fetchLikes(formattedPosts);

    } catch (error) {
      console.error(
        'Failed to load travel feed:',
        error
      );

      setPosts([]);

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH LIKES
  // =====================================================

  const fetchLikes = async (
    postList: Post[]
  ) => {
    if (!user) return;

    const postIds = postList.map(
      (post) => post.id
    );

    if (postIds.length === 0) return;

    const {
      data,
      error,
    } = await supabase
      .from('travel_post_likes')
      .select(
        'post_id, user_id'
      )
      .in(
        'post_id',
        postIds
      );

    if (error) {
      console.error(
        'Likes fetch error:',
        error
      );

      return;
    }

    const likeCounts:
      Record<string, number> = {};

    const userLikes:
      Record<string, boolean> = {};

    (data || []).forEach(
      (like: any) => {
        likeCounts[like.post_id] =
          (likeCounts[like.post_id] || 0) +
          1;

        if (
          like.user_id === user.id
        ) {
          userLikes[
            like.post_id
          ] = true;
        }
      }
    );

    setLikes(likeCounts);
    setLikedPosts(userLikes);
  };

  // =====================================================
  // LIKE / UNLIKE
  // =====================================================

  const handleLike = async (
    postId: string
  ) => {
    if (!user) return;

    const alreadyLiked =
      likedPosts[postId] === true;

    if (alreadyLiked) {
      const {
        error,
      } = await supabase
        .from('travel_post_likes')
        .delete()
        .eq(
          'post_id',
          postId
        )
        .eq(
          'user_id',
          user.id
        );

      if (error) {
        console.error(
          'Unlike error:',
          error
        );

        return;
      }

      setLikedPosts(
        (prev) => ({
          ...prev,
          [postId]: false,
        })
      );

      setLikes(
        (prev) => ({
          ...prev,
          [postId]:
            Math.max(
              (prev[postId] || 1) - 1,
              0
            ),
        })
      );

    } else {
      const {
        error,
      } = await supabase
        .from('travel_post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
        });

      if (error) {
        console.error(
          'Like error:',
          error
        );

        return;
      }

      setLikedPosts(
        (prev) => ({
          ...prev,
          [postId]: true,
        })
      );

      setLikes(
        (prev) => ({
          ...prev,
          [postId]:
            (prev[postId] || 0) + 1,
        })
      );
    }
  };

  // =====================================================
  // FETCH COMMENTS
  // =====================================================

  const fetchComments = async (
    postId: string
  ) => {
    const {
      data,
      error,
    } = await supabase
      .from('travel_post_comments')
      .select(`
        id,
        post_id,
        user_id,
        comment,
        created_at
      `)
      .eq(
        'post_id',
        postId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        'Comments error:',
        error
      );

      return;
    }

    const userIds =
      Array.from(
        new Set(
          (data || [])
            .map(
              (comment: any) =>
                comment.user_id
            )
            .filter(Boolean)
        )
      );

    let profileMap:
      Record<string, any> = {};

    if (
      userIds.length > 0
    ) {
      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url
        `)
        .in(
          'id',
          userIds
        );

      if (profilesError) {
        console.error(
          'Comment profiles error:',
          profilesError
        );
      }

      profileMap = (
        profilesData || []
      ).reduce(
        (
          acc: Record<string, any>,
          item: any
        ) => {
          acc[item.id] = item;

          return acc;
        },
        {}
      );
    }

    const formattedComments:
      Comment[] =
      (data || []).map(
        (comment: any) => ({
          ...comment,

          profile:
            profileMap[
              comment.user_id
            ] || null,
        })
      );

    setComments(
      (prev) => ({
        ...prev,
        [postId]:
          formattedComments,
      })
    );
  };

  // =====================================================
  // TOGGLE COMMENTS
  // =====================================================

  const toggleComments = async (
    postId: string
  ) => {
    const isOpen =
      openComments[postId] === true;

    setOpenComments(
      (prev) => ({
        ...prev,
        [postId]: !isOpen,
      })
    );

    if (!isOpen) {
      await fetchComments(
        postId
      );
    }
  };

  // =====================================================
  // ADD COMMENT
  // =====================================================

  const handleComment = async (
    postId: string
  ) => {
    if (!user) return;

    const text =
      commentText[
        postId
      ]?.trim();

    if (!text) return;

    try {
      setPostingComment(
        (prev) => ({
          ...prev,
          [postId]: true,
        })
      );

      const {
        error,
      } = await supabase
        .from(
          'travel_post_comments'
        )
        .insert({
          post_id: postId,
          user_id: user.id,
          comment: text,
        });

      if (error) {
        console.error(
          'Comment insert error:',
          error
        );

        alert(
          `Comment failed: ${error.message}`
        );

        return;
      }

      setCommentText(
        (prev) => ({
          ...prev,
          [postId]: '',
        })
      );

      await fetchComments(
        postId
      );

    } finally {
      setPostingComment(
        (prev) => ({
          ...prev,
          [postId]: false,
        })
      );
    }
  };

  // =====================================================
  // SHARE
  // =====================================================

  const handleShare = async (
    post: Post
  ) => {
    const url =
      window.location.origin +
      '/home';

    const postName =
      post.profile?.full_name ||
      'Traveler';

    const destination =
      post.trips?.destination ||
      'their journey';

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            'Travelmate Travel Story',

          text:
            `${postName} shared a travel story from ${destination} 🌍`,

          url,
        });

      } else {
        await navigator.clipboard.writeText(
          url
        );

        alert(
          'Post link copied! 🔗'
        );
      }

    } catch {
      console.log(
        'Share cancelled'
      );
    }
  };

  // =====================================================
  // USER NAME
  // =====================================================

  const getUserName = (
    post: Post
  ) => {
    const fullName =
      post.profile?.full_name?.trim();

    if (fullName) {
      return fullName;
    }

    return 'Traveler';
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    date: string
  ) => {
    if (!date) return '';

    return new Date(
      date
    ).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // GET POST IMAGES
  // =====================================================

  const getImages = (
    post: Post
  ): string[] => {
    if (
      Array.isArray(
        post.image_urls
      ) &&
      post.image_urls.length > 0
    ) {
      return post.image_urls.filter(
        Boolean
      );
    }

    if (
      post.image_url
    ) {
      return [
        post.image_url,
      ];
    }

    return [];
  };

  // =====================================================
  // OPEN USER PROFILE
  // =====================================================

  const openUserProfile = (
    userId: string
  ) => {
    if (!userId) return;

    navigate(
      `/public-profile/${userId}`
    );
  };

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          WELCOME
      ================================================= */}

      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">

        <div className="flex flex-col md:flex-row items-center gap-6">

          {/* CURRENT USER PHOTO */}

          <Link
            to="/profile"
            className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/30 overflow-hidden shrink-0"
          >

            {profile?.avatar_url ? (

              <img
                src={
                  profile.avatar_url
                }
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

            ) : (

              profile?.full_name?.[0]?.toUpperCase() ||
              '?'

            )}

          </Link>

          <div className="text-center md:text-left">

            <h1 className="text-3xl md:text-5xl font-bold">

              Welcome to Travelmate,{' '}

              {profile?.full_name ||
                'Traveler'}

              !

            </h1>

            <p className="text-emerald-50 mt-4 text-xl">

              Your next great adventure is
              just a few clicks away.

            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          FEED HEADER
      ================================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold text-stone-900">
            Travel Feed
          </h2>

          <p className="text-sm text-stone-500 mt-1">
            Explore journeys shared by fellow travellers
          </p>

        </div>

        <Link
          to="/travel-post"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
        >

          <Plus className="w-4 h-4" />

          Share Journey

        </Link>

      </div>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (

        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">

          <Loader2
            className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4"
          />

          <p className="text-stone-500">
            Loading travel feed...
          </p>

        </div>

      )}

      {/* =================================================
          EMPTY
      ================================================= */}

      {!loading &&
        posts.length === 0 && (

          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">

            <ImageIcon className="w-10 h-10 text-emerald-600 mx-auto mb-4" />

            <h3 className="text-xl font-bold text-stone-900">
              No travel posts yet
            </h3>

            <p className="text-stone-500 mt-2 mb-6">
              Be the first traveller to share your journey!
            </p>

            <Link
              to="/travel-post"
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-bold"
            >

              <Plus className="w-4 h-4" />

              Share Your Journey

            </Link>

          </div>

        )}

      {/* =================================================
          POSTS
      ================================================= */}

      {!loading &&
        posts.length > 0 && (

          <div className="max-w-2xl mx-auto space-y-6">

            {posts.map(
              (post) => {

                const trip =
                  post.trips;

                const name =
                  getUserName(
                    post
                  );

                const images =
                  getImages(
                    post
                  );

                const imageIndex =
                  currentImage[
                    post.id
                  ] || 0;

                return (

                  <article
                    key={
                      post.id
                    }
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm"
                  >

                    {/* =================================================
                        POST HEADER
                    ================================================= */}

                    <div className="flex items-center justify-between p-4">

                      <button
                        type="button"
                        onClick={() =>
                          openUserProfile(
                            post.user_id
                          )
                        }
                        className="flex items-center gap-3 text-left"
                      >

                        {/* PROFILE PHOTO */}

                        <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center overflow-hidden border border-emerald-100 shrink-0">

                          {post.profile?.avatar_url ? (

                            <img
                              src={
                                post.profile
                                  .avatar_url
                              }
                              alt={
                                name
                              }
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />

                          ) : (

                            <span className="font-bold text-emerald-700 text-lg">

                              {name
                                .charAt(
                                  0
                                )
                                .toUpperCase() || (

                                <User className="w-5 h-5" />

                              )}

                            </span>

                          )}

                        </div>

                        {/* NAME */}

                        <div>

                          <h3 className="font-bold text-stone-900 hover:text-emerald-600 transition">

                            {name}

                          </h3>

                          {trip?.destination && (

                            <p className="text-xs text-stone-400">

                              {trip.destination}

                            </p>

                          )}

                        </div>

                      </button>

                    </div>

                    {/* =================================================
                        IMAGES
                    ================================================= */}

                    {images.length > 0 ? (

                      <div className="relative bg-stone-100">

                        <img
                          src={
                            images[
                              imageIndex
                            ]
                          }
                          alt={
                            trip?.destination ||
                            'Travel'
                          }
                          className="w-full max-h-[550px] object-cover"
                          onError={(
                            e
                          ) => {

                            console.error(
                              'Image failed:',
                              images[
                                imageIndex
                              ]
                            );

                            e.currentTarget.style.display =
                              'none';

                          }}
                        />

                        {images.length >
                          1 && (

                          <>

                            <button
                              type="button"
                              onClick={() =>
                                setCurrentImage(
                                  (prev) => ({
                                    ...prev,

                                    [post.id]:
                                      imageIndex ===
                                      0
                                        ? images.length -
                                          1
                                        : imageIndex -
                                          1,
                                  })
                                )
                              }
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                            >

                              <ChevronLeft size={20} />

                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setCurrentImage(
                                  (prev) => ({
                                    ...prev,

                                    [post.id]:
                                      imageIndex ===
                                      images.length -
                                        1
                                        ? 0
                                        : imageIndex +
                                          1,
                                  })
                                )
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
                            >

                              <ChevronRight size={20} />

                            </button>

                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">

                              {imageIndex +
                                1}{' '}

                              /{' '}

                              {images.length}

                            </div>

                          </>

                        )}

                      </div>

                    ) : (

                      <div className="h-64 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">

                        <div className="text-center">

                          <MapPin className="w-10 h-10 text-emerald-500 mx-auto mb-2" />

                          <p className="text-emerald-700 font-bold text-lg">

                            {trip?.destination ||
                              'Travel Adventure'}

                          </p>

                        </div>

                      </div>

                    )}

                    {/* =================================================
                        ACTIONS
                    ================================================= */}

                    <div className="px-4 pt-4 flex items-center gap-6">

                      {/* LIKE */}

                      <button
                        type="button"
                        onClick={() =>
                          handleLike(
                            post.id
                          )
                        }
                        className={`flex items-center gap-2 transition ${
                          likedPosts[
                            post.id
                          ]
                            ? 'text-red-500'
                            : 'text-stone-500 hover:text-red-500'
                        }`}
                      >

                        <Heart
                          className="w-5 h-5"
                          fill={
                            likedPosts[
                              post.id
                            ]
                              ? 'currentColor'
                              : 'none'
                          }
                        />

                        <span className="text-sm font-medium">

                          {likes[
                            post.id
                          ] || 0}

                        </span>

                      </button>

                      {/* COMMENT */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleComments(
                            post.id
                          )
                        }
                        className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition"
                      >

                        <MessageCircle className="w-5 h-5" />

                        <span className="text-sm">
                          Comment
                        </span>

                      </button>

                      {/* SHARE */}

                      <button
                        type="button"
                        onClick={() =>
                          handleShare(
                            post
                          )
                        }
                        className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 transition"
                      >

                        <Share2 className="w-5 h-5" />

                        <span className="text-sm">
                          Share
                        </span>

                      </button>

                    </div>

                    {/* =================================================
                        DETAILS
                    ================================================= */}

                    <div className="p-4">

                      {trip?.destination && (

                        <div className="flex items-center gap-2 text-emerald-600 font-bold mb-2">

                          <MapPin className="w-4 h-4" />

                          {trip.destination}

                        </div>

                      )}

                      {trip?.start_date &&
                        trip?.end_date && (

                          <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">

                            <Calendar className="w-4 h-4" />

                            {formatDate(
                              trip.start_date
                            )}

                            {' – '}

                            {formatDate(
                              trip.end_date
                            )}

                          </div>

                        )}

                      {post.caption && (

                        <p className="text-stone-700 leading-relaxed">

                          <span className="font-bold">

                            {name}

                          </span>{' '}

                          {post.caption}

                        </p>

                      )}

                    </div>

                    {/* =================================================
                        COMMENTS
                    ================================================= */}

                    {openComments[
                      post.id
                    ] && (

                      <div className="border-t border-stone-100 p-4">

                        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">

                          {(comments[
                            post.id
                          ] || []).length ===
                          0 ? (

                            <p className="text-sm text-stone-400 text-center py-3">

                              No comments yet. Be the first! 💬

                            </p>

                          ) : (

                            comments[
                              post.id
                            ].map(
                              (
                                comment
                              ) => {

                                const commentName =
                                  comment.profile?.full_name ||
                                  'Traveler';

                                return (

                                  <div
                                    key={
                                      comment.id
                                    }
                                    className="flex gap-3"
                                  >

                                    {/* COMMENT USER PHOTO */}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        openUserProfile(
                                          comment.user_id
                                        )
                                      }
                                      className="w-8 h-8 rounded-full bg-emerald-50 overflow-hidden flex items-center justify-center shrink-0"
                                    >

                                      {comment.profile?.avatar_url ? (

                                        <img
                                          src={
                                            comment
                                              .profile
                                              .avatar_url
                                          }
                                          alt={
                                            commentName
                                          }
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />

                                      ) : (

                                        <span className="text-xs font-bold text-emerald-700">

                                          {commentName
                                            .charAt(
                                              0
                                            )
                                            .toUpperCase()}

                                        </span>

                                      )}

                                    </button>

                                    <div className="bg-stone-50 rounded-xl px-3 py-2 flex-1">

                                      <button
                                        type="button"
                                        onClick={() =>
                                          openUserProfile(
                                            comment.user_id
                                          )
                                        }
                                        className="text-xs font-bold text-stone-800 hover:text-emerald-600"
                                      >

                                        {commentName}

                                      </button>

                                      <p className="text-sm text-stone-600">

                                        {comment.comment}

                                      </p>

                                    </div>

                                  </div>

                                );

                              }
                            )

                          )}

                        </div>

                        {/* COMMENT INPUT */}

                        <div className="flex gap-2">

                          <input
                            value={
                              commentText[
                                post.id
                              ] || ''
                            }
                            onChange={(
                              e
                            ) =>
                              setCommentText(
                                (prev) => ({
                                  ...prev,

                                  [post.id]:
                                    e.target.value,
                                })
                              )
                            }
                            onKeyDown={(
                              e
                            ) => {

                              if (
                                e.key ===
                                'Enter'
                              ) {

                                handleComment(
                                  post.id
                                );

                              }

                            }}
                            placeholder="Write a comment..."
                            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />

                          <button
                            type="button"
                            disabled={
                              postingComment[
                                post.id
                              ]
                            }
                            onClick={() =>
                              handleComment(
                                post.id
                              )
                            }
                            className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:bg-stone-300"
                          >

                            {postingComment[
                              post.id
                            ] ? (

                              <Loader2
                                size={17}
                                className="animate-spin"
                              />

                            ) : (

                              <Send size={17} />

                            )}

                          </button>

                        </div>

                      </div>

                    )}

                  </article>

                );

              }
            )}

          </div>

        )}

    </div>
  );
}