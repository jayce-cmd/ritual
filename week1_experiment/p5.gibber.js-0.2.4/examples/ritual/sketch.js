function setup() {
  createCanvas( windowWidth, windowHeight )

  drums = EDrums('x*o*x*o-')
  follow = Follow( drums )

  //drums.amp = .75

  bass = FM('bass')
  .note.seq( [0,0,0,7,14,13].rnd(), [1/8,1/16].rnd(1/16,2) )

  rhodes = Synth( 'rhodes', {amp:.35} )
  .chord.seq( Rndi(0,6,3), 1 )
  .fx.add( Delay() )

  //fft = FFT( fftSize )

  Gibber.scale.root.seq( ['c4','ab3','bb3'], [4,2,2] )
  Gibber.scale.mode.seq( ['Minor','Mixolydian'], [6,2] )
}

function draw() {
  background( follow.getValue() * 255 )


}
