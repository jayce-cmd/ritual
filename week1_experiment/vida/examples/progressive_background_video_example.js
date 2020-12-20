/*****************************************************************************\
********************************** V I D A ************************************
*******************************************************************************

  p5.vida 0.3.00a by Paweł Janicki, 2017-2019
    https://tetoki.eu/vida | https://paweljanicki.jp

*******************************************************************************

  VIDA by Paweł Janicki is licensed under a Creative Commons
  Attribution-ShareAlike 4.0 International License
  (http://creativecommons.org/licenses/by-sa/4.0/). Based on a work at:
  https://tetoki.eu.

*******************************************************************************

  VIDA is a simple library that adds camera (or video) based motion detection
  and blob tracking functionality to p5js.

  The library allows motion detection based on a static or progressive
  background; defining rectangular zones in the monitored image, inside which
  the occurrence of motion triggers the reaction of the program; detection of
  moving objects ("blobs") with unique index, position, mass, rectangle,
  approximated polygon.

  The main guidelines of the library are to maintain the code in a compact
  form, easy to modify, hack and rework.

  VIDA is a part of the Tetoki! project (https://tetoki.eu) and is developed
  thanks to substantial help and cooperation with the WRO Art Center
  (https://wrocenter.pl) and HAT Research Center
  (http://artandsciencestudies.com).

  Notes:

    [1] Limitations: of course, the use of the camera from within web browser
    is subject to various restrictions mainly related to security settings (in
    particular, browsers differ significantly in terms of enabling access to
    the video camera for webpages (eg p5js sketches) loaded from local media or
    from the network - in the last case it is also important if the connection
    uses the HTTPS protocol [or HTTP]). Therefore, if there are problems with
    access to the video camera from within a web browser, it is worth testing a
    different one. During developement, for on-the-fly checks, VIDA is mainly
    tested with Firefox, which by default allows you to access the video camera
    from files loaded from local media. VIDA itself does not impose any
    additional specific restrictions related to the type and parameters of the
    camera - any video camera working with p5js should work with the library.
    You can find valuable information on this topic at https://webrtc.org and
    in the documentation of the web browser you use.
    
    [2] Also it is worth remembering that blob detection is rather expensive
    computationally, so it's worth to stick to the lowest possible video
    resolutions if you plan to run your programs on the hardware, the
    performance you are not sure. The efficiency in processing video from a
    video camera and video files should be similar.

    [3] VIDA is using (with a few exceptions) normalized coords instead of
    pixel-based. Thus, the coordinates of the active zones, the location of
    detected moving objects (and some of their other parameters) are
    represented by floating point numbers within the range from 0.0 to 1.0. The
    use of normalized coordinates and parameters allows to manipulate the
    resolution of the image being processed (eg from a video camera) without
    having to change eg the position of active zones. analogously, data
    describing moving objects is easier to use, if their values are not related
    to any specific resolution expressed in pixels. Names of all normalized
    parameters are preceded by the prefix "norm". The upper left corner of the
    image has the coordinates [0.0, 0.0]. The bottom right corner of the image
    has the coordinates [1.0, 1.0].

                      [0.0, 0.0]
                      +------------------------------|
                      |              [0.5, 0.2]      |
                      |              +               |
                      |                              |
                      |      [0.25, 0.5]             |
                      |      +                       |
                      |                              |
                      |                   [0.7, 0.8] |
                      |                   +          |
                      |                              |
                      |------------------------------+
                                                     [1.0, 1.0]
                                                     
\*****************************************************************************/

var myVideo, // video file
    myVida;  // VIDA

/*
  Some web browsers do not allow the automatic start of a video file and allow
  you to play the file only as a result of user interaction. Therefore, we will
  use this variable to manage the start of the file after interacting with the
  user.
*/
var interactionStartedFlag = false;

function setup() {
  createCanvas(640, 480); // we need some space...

  // load test video file
  myVideo = createVideo(['test_320x240.mp4', 'test_320x240.webm']);
  // workaround for browser autoplay restrictions
  myVideo.elt.muted = true;
  // fix for some mobile browsers
  myVideo.elt.setAttribute('playsinline', '');
  // loop the video, hide the original object and start the playback
  myVideo.loop(); myVideo.hide();

  /*
    VIDA stuff. One parameter - the current sketch - should be passed to the
    class constructor (thanks to this you can use Vida e.g. in the instance
    mode).
  */
  myVida = new Vida(this); // create the object
  /*
    Turn on the progressive background mode.
  */
  myVida.progressiveBackgroundFlag = true;
  /*
    The value of the feedback for the procedure that calculates the background
    image in progressive mode. The value should be in the range from 0.0 to 1.0
    (float). Typical values of this variable are in the range between ~0.9 and
    ~0.98.
  */
  myVida.imageFilterFeedback = 0.97;
  /*
    The value of the threshold for the procedure that calculates the threshold
    image. The value should be in the range from 0.0 to 1.0 (float).
  */
  myVida.imageFilterThreshold = 0.1;

  frameRate(30); // set framerate
}

function draw() {
  if(myVideo !== null && myVideo !== undefined) { // safety first
    /*
      Wait for user interaction. Some browsers prevent video playback if the
      user does not interact with the webpage yet.
    */
    if(!interactionStartedFlag) {
      background(0);
      push();
      noStroke(); fill(255); textAlign(CENTER, CENTER);
      text('click or tap to start video playback', width / 2, height / 2);
      pop();
      return;
    }
    background(0, 0, 255);
    /*
      Call VIDA update function, to which we pass the current video frame as a
      parameter. Usually this function is called in the draw loop (once per
      repetition).
    */
    myVida.update(myVideo);
    /*
      Now we can display images: source video and subsequent stages of image
      transformations made by VIDA.
    */
    image(myVideo, 0, 0);
    image(myVida.backgroundImage, 320, 0);
    image(myVida.differenceImage, 0, 240);
    image(myVida.thresholdImage, 320, 240);
    // let's also describe the displayed images
    noStroke(); fill(255, 255, 255);
    text('raw video', 20, 20);
    text('vida: progressive background image', 340, 20);
    text('vida: difference image', 20, 260);
    text('vida: threshold image', 340, 260);
  }
  else {
    /*
      If there are problems with the video file (it's a simple mechanism so not
      every problem with the video file will be detected, but it's better than
      nothing) we will change the background color to alarmistically red.
    */
    background(255, 0, 0);
  }
}

function touchEnded() {
  // init video (if needed)
  if(!interactionStartedFlag) safeStartVideo();
}

/*
  Helper function that starts playback on browsers that require interaction
  with the user before playing video files.
*/
function safeStartVideo() {
  // safety first..
  if(myVideo === null || myVideo === undefined) return;
  // here we check if the video is already playing...
  if(!isNaN(myVideo.time())) {
    if(myVideo.time() < 1) {
      interactionStartedFlag = true;
      return;
    }
  }
  // if no, we will try to play it
  try {
    myVideo.loop(); myVideo.hide();
    interactionStartedFlag = true;
  }
  catch(e) {
    console.log('[safeStartVideo] ' + e);
  }
}