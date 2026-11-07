export function videoURL(row) {
  if (row?.video_source === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(row.youtube_video_id || '')) {
    return 'https://www.youtube-nocookie.com/embed/' + row.youtube_video_id;
  }
  return row?.video_url || null;
}

export function renderVideo(row, documentRef = document) {
  const url = videoURL(row);
  if (!url) return null;
  if (row.video_source === 'youtube') {
    const frame = documentRef.createElement('iframe');
    frame.src = url;
    frame.title = row.titre || 'Vidéo';
    frame.loading = 'lazy';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    return frame;
  }
  const video = documentRef.createElement('video');
  video.controls = true;
  video.preload = 'metadata';
  video.playsInline = true;
  video.src = url;
  return video;
}
