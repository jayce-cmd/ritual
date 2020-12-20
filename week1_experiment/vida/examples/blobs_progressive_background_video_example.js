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
  myVida.imageFilterFeedback = 0.96;
  /*
   The value of the threshold for the procedure that calculates the threshold
   image. The value should be in the range from 0.0 to 1.0 (float).
  */
  myVida.imageFilterThreshold = 0.1;
  /*
    In order for VIDA to handle blob detection (it doesn't by default), we set
    this flag.
  */
  myVida.handleBlobsFlag = true;
  /*
    Normalized values of parameters defining the smallest and highest allowable
    mass of the blob.
  */
  //myVida.normMinBlobMass = 0.0002;  // uncomment if needed
  //myVida.normMaxBlobMass = 0.5;  // uncomment if needed
  /*
    Normalized values of parameters defining the smallest and highest allowable
    area of the blob boiunding box.
  */
  //myVida.normMinBlobArea = 0.0002;  // uncomment if needed
  //myVida.normMaxBlobArea = 0.5;  // uncomment if needed
  /*
    If this flag is set to "true", VIDA will try to maintain permanent
    identifiers of detected blobs that seem to be a continuation of the
    movement of objects detected earlier - this prevents random changes of
    identifiers when changing the number and location of detected blobs.
  */
  myVida.trackBlobsFlag = true;
  /*
    Normalized value of the distance between the tested blobs of the current
    and previous generation, which allows treating the new blob as the
    continuation of the "elder".
  */
  //myVida.trackBlobsMaxNormDist = 0.3; // uncomment if needed
  /*
    VIDA may prefer smaller blobs located inside larger or the opposite: reject
    smaller blobs inside larger ones. The mechanism can also be completely
    disabled. Here are the possibilities:
      [your vida object].REJECT_NONE_BLOBS
      [your vida object].REJECT_INNER_BLOBS
      [your vida object].REJECT_OUTER_BLOBS
    The default value is REJECT_NONE_BLOBS.
  */
  //myVida.rejectBlobsMethod = myVida.REJECT_NONE_BLOBS; // uncomment if needed
  /*
    If this flag is set to "true", VIDA will generate polygons that correspond
    approximately to the shape of the blob. If this flag is set to "false", the
    polygons will not be generated. Default vaulue is false. Note: generating
    polygons can be burdensome for the CPU - turn it off if you do not need it.
  */
  myVida.approximateBlobPolygonsFlag = true;
  /*
    Variable (integer) that stores the value corresponding to the number of
    polygon points describing the shape of the blobs. The minimum value of this
    variable is 3.
  */
  myVida.pointsPerApproximatedBlobPolygon = 8;

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
      Now we can display images: source video (mirrored) and subsequent stages
      of image transformations made by VIDA.
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
    /*
      In this example, we use the built-in VIDA function for drawing blobs. We
      use the version of the function with two parameters (given in pixels)
      which are the coordinates of the upper left corner of the graphic
      representation of the blobs. VIDA is also equipped with a version of this
      function with four parameters (the meaning of the first and second
      parameter does not change, and the third and fourth mean width and height
      respectively). For example, to draw the blobs on the entire available
      surface, use the function in this way:
        [your vida object].drawBlobs(0, 0, width, height);
    */
    myVida.drawBlobs(320, 240);
  }
  else {
    /*
      If there are problems with the capture device (it's a simple mechanism so
      not every problem with the camera will be detected, but it's better than
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