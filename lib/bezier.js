// This implementation is based on great ideas by Bartosz
// Ciechanowski about approximation of Bezier curves with lines.
//
// http://ciechanowski.me/blog/2014/02/18/drawing-bezier-curves/

function bezier(controlPoints, t) {
    const nt = 1.0 - t;
    
    // These are scalars that define the Bezier function.
    const scalars = [nt*nt*nt, 3.0*nt*nt*t, 3.0*nt*t*t, t*t*t];
    
    const result = new Phaser.Point();

    for (let i = 0; i < controlPoints.length; ++i)
        result.add(controlPoints[i].x * scalars[i], controlPoints[i].y * scalars[i]);
    
    return result;
}

function bezierDerivate(controlPoints, t) {
    const nt = 1.0 - t;
    
    // These are scalars of the derivate of the Bezier function in respect of t and n.
    const scalars = [-3.0*nt*nt, 3.0*(1.0 - 4.0*t + 3.0*t*t), 3.0*(2.0*t - 3.0*t*t), 3.0*t*t];
    
    const result = new Phaser.Point();

    for (let i = 0; i < controlPoints.length; ++i)
        result.add(controlPoints[i].x * scalars[i], controlPoints[i].y * scalars[i]);
    
    return result;
}

function bezierNormal(controlPoints, t) {
    return bezierDerivate(controlPoints, t).normalize().perp();
}

function bezierSegmentCount(controlPoints, minimumSegments) {
    let length = 0.0;
    
    for (let i = 1; i < controlPoints.length; ++i)
        length += Phaser.Point.subtract(controlPoints[i - 1], controlPoints[i]).getMagnitude();
    
    const segments = length / 30.0;
    
    return Math.ceil(Math.sqrt(segments * segments * 0.6 + minimumSegments * minimumSegments));
}
