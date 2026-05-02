document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('saturn-video');
    if (!video) return;

    let direction = 1;

    video.addEventListener('timeupdate', function () {
        if (direction === 1 && video.currentTime >= video.duration - 0.2) {
            direction = -1;
            reverseVideo();
        } else if (direction === -1 && video.currentTime <= 0.1) {
            direction = 1;
            video.play();
        }
    });

    function reverseVideo() {
        if (direction === -1) {
            video.currentTime -= 0.03;
            if (video.currentTime > 0) {
                // Controla la fluidez del retroceso (33ms = 30fps aprox)
                setTimeout(reverseVideo, 33);
            }
        }
    }
});
