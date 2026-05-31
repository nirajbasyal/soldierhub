// Pure post-row normalization shared by client and server code paths.
// No "use client" directive and no browser globals, so this is safe to import
// from Server Components (e.g. the SSR home feed) as well as the browser.

function getAuthorAvatarUrl(row = {}, profile = null) {
  return (
    row.author_avatar_url ||
    row.author_avatar_url_cached ||
    row.profile_avatar_url ||
    row.avatar_url ||
    row.author?.avatar_url ||
    row.profile?.avatar_url ||
    row.profiles?.avatar_url ||
    row.user?.avatar_url ||
    profile?.avatar_url ||
    null
  );
}

export function normalizePostRow(row = {}) {
  const profile = row.profile || row.profiles || row.author || null;
  const postId = row.id || row.post_id || row.postId || row.post?.id || null;
  const commentCount = row.comment_count ?? row.comments_count ?? row.reply_count ?? 0;
  const isAnonymous = Boolean(row.anonymous);
  const authorAvatarUrl = isAnonymous ? null : getAuthorAvatarUrl(row, profile);
  const originalImageUrl = row.image_url || row.imageUrl || null;
  const originalImageKey = row.image_key || row.imageKey || null;
  const originalImageWidth = row.image_width || row.imageWidth || null;
  const originalImageHeight = row.image_height || row.imageHeight || null;
  const originalImageSize = row.image_size || row.imageSize || null;
  const thumbnailImageUrl = row.image_thumbnail_url || row.imageThumbnailUrl || row.thumbnail_url || null;
  const thumbnailImageKey = row.image_thumbnail_key || row.imageThumbnailKey || row.thumbnail_key || null;
  const thumbnailImageWidth = row.image_thumbnail_width || row.imageThumbnailWidth || row.thumbnail_width || null;
  const thumbnailImageHeight = row.image_thumbnail_height || row.imageThumbnailHeight || row.thumbnail_height || null;
  const thumbnailImageSize = row.image_thumbnail_size || row.imageThumbnailSize || row.thumbnail_size || null;

  return {
    ...row,
    id: postId,
    post_id: postId,
    author_id:
      row.author_id ||
      row.user_id ||
      row.profile_id ||
      row.created_by ||
      row.author_user_id ||
      profile?.id ||
      null,
    author_name:
      row.author_name ||
      row.author_name_cached ||
      row.full_name ||
      row.profile_full_name ||
      profile?.full_name ||
      "Member",
    author_color:
      row.author_color ||
      row.author_color_cached ||
      row.avatar_color ||
      row.profile_avatar_color ||
      profile?.avatar_color ||
      "#314A66",
    author_avatar_url: authorAvatarUrl,
    author_avatar_url_cached: authorAvatarUrl,
    image_url: thumbnailImageUrl || originalImageUrl,
    image_key: thumbnailImageKey || originalImageKey,
    image_width: thumbnailImageWidth || originalImageWidth,
    image_height: thumbnailImageHeight || originalImageHeight,
    image_size: thumbnailImageSize || originalImageSize,
    image_full_url: originalImageUrl,
    image_full_key: originalImageKey,
    image_full_width: originalImageWidth,
    image_full_height: originalImageHeight,
    image_full_size: originalImageSize,
    image_thumbnail_url: thumbnailImageUrl,
    image_thumbnail_key: thumbnailImageKey,
    image_thumbnail_width: thumbnailImageWidth,
    image_thumbnail_height: thumbnailImageHeight,
    image_thumbnail_size: thumbnailImageSize,
    upvote_count: row.upvote_count ?? row.upvotes_count ?? 0,
    comment_count: commentCount,
    reply_count: commentCount,
    report_count: row.report_count ?? row.reports_count ?? 0,
  };
}
