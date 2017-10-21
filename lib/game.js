class Track {
    constructor(game, sizeX, sizeY, isClockwise, scale) {
        scale = scale || 1.0;
    
        const controlPoints = game.cache.getJSON('circuit').map(cp => cp.map(p => new Phaser.Point(p.x, p.y).multiply(sizeX - scale, sizeY - scale)));
        const graphics = game.add.graphics(0, 0);
        
        this.segments = this.buildPolygonSegments(scale / 2.0, scale / 2.0, controlPoints, scale);
        this.group = game.add.group();
        
        // Draw each segment.
        for (let i = 0; i < this.segments.length; ++i) {
        
            // Draw each polygon.
            for (let j = 0; j < this.segments[i].length; ++j) {
                if (i === 0 && (j === 1 || j === 0))
                    graphics.beginFill(0xffffff);
                else
                    graphics.beginFill(0x222222);
                    
                graphics.drawPolygon(this.segments[i][j]);
                graphics.endFill();
            }
        }
    
        this.group.add(graphics);

        this.startPoint = bezier(controlPoints[0], 0.0);
        this.startNormal = bezierNormal(controlPoints[0], 0.0);
        this.isClockwise = isClockwise;
    }
    
    destroy() {
        this.group.removeAll();
    }
    
    contains(x, y) {
        for (let i = 0; i < this.segments.length; ++i) {
            for (let j = 0; j < this.segments[i].length; ++j) {
                if (this.segments[i][j].contains(x, y))
                    return true;
            }
        }
        
        // None of segments contained point.
        return false;
    }
    
    getStartPoint() {
        return this.startPoint;
    }
    
    getStartRotation() {
        // It seems that it is more easier if all sprites have right = 0 degrees
        // which translates to (-1, 0) vector. Also, flip start rotation if track
        // is anti-clockwise.
        return this.startNormal.perp().angle(new Phaser.Point(-1, 0), true) + !this.isClockwise * 180.0;
    }
    
    buildPolygonSegments(x, y, controlPointSegments, scale) {
        const segments = [];
        
        for (let i = 0; i < controlPointSegments.length; ++i) {
            const count = bezierSegmentCount(controlPointSegments[i], 10);
            const polygons = [];
            
            for (let j = 0; j < count; ++j) {
                let tesselationPoint1;
                let normalVector1;
                
                // Check if the path is joined in which case we should connect
                // last segment with the first one.
                if (j === 0 && i === 0 && Phaser.Point.equals(controlPointSegments[controlPointSegments.length - 1][3], controlPointSegments[j][0])) {
                    const t1 = 1.0;
                    
                    tesselationPoint1 = bezier(controlPointSegments[controlPointSegments.length - 1], t1);
                    normalVector1 = bezierNormal(controlPointSegments[controlPointSegments.length - 1], t1);
                }
                
                // Check if we should connect a point from last segment.
                else if (j === 0 && i > 0) {
                    const t1 = 1.0;

                    tesselationPoint1 = bezier(controlPointSegments[i - 1], t1);
                    normalVector1 = bezierNormal(controlPointSegments[i - 1], t1);
                }
                
                // Check if we should connect a previous point of this segment.
                else if (j > 0) {
                    const t1 = (j - 1) / (count - 1);
                    
                    tesselationPoint1 = bezier(controlPointSegments[i], t1);
                    normalVector1 = bezierNormal(controlPointSegments[i], t1);
                }
                
                // This is the first point, no need to connect anything.
                else
                    continue;
                
                const t2 = j / (count - 1);
                
                const tesselationPoint2 = bezier(controlPointSegments[i], t2);
                const normalVector2 = bezierNormal(controlPointSegments[i], t2);
                
                // Make vectors correct size by uniformly scaling them.
                // Note that since these expand from the middle, we
                // divide both numbers by two.
                normalVector1.multiply(scale / 2.0, scale / 2.0);
                normalVector2.multiply(scale / 2.0, scale / 2.0);
                
                // Construct polygon for each tesselation segment with
                // four points. Basically, each polygon is a slice of
                // the path that look like this:
                //
                //    a             c
                //    +-------------+
                //    |             |
                // t1 |_____________| t2 
                //    |             |
                //    |             |
                //    +-------------+
                //    b             d
                //
                // where a, b, c, d are four points that define the polygon.
                // So, t1 and t2 are in the middle of the path and polygon 
                // points are extruded outwards by their respectful normal
                // vectors. 
                const a = Phaser.Point.subtract(tesselationPoint1, normalVector1);
                const b = Phaser.Point.add(tesselationPoint1, normalVector1);
                let c = Phaser.Point.subtract(tesselationPoint2, normalVector2);
                let d = Phaser.Point.add(tesselationPoint2, normalVector2);
                
                // Make sure that c point is on the positive side of the ab line. Otherwise,
                // polygons that we draw are incorrectly shaped. This may happen when we
                // connect different segments together.
                if (Phaser.Point.subtract(a, b).perp().dot(Phaser.Point.subtract(c, a)) < 0)
                    c = a.clone();
                
                // Make sure that d point is on the positive side of the ab line. Otherwise,
                // polygons that we draw are incorrectly shaped. This may happen when we
                // connect different segments together.
                if (Phaser.Point.subtract(a, b).perp().dot(Phaser.Point.subtract(d, b)) < 0)
                    d = b.clone();
                
                // Create a polygon in clockwise direction from four
                // points as described above.
                polygons.push(new Phaser.Polygon([
                    a.add(x, y), c.add(x, y), d.add(x, y), b.add(x, y)
                ]));
            }
            
            segments.push(polygons);
        }
        
        return segments;
    }
}

class Car {
    constructor(game, track, scale) {
        scale = scale || 1.0;
    
        const position = track.getStartPoint();
    
        // Create a car sprite on the track.
        this.sprite = game.add.sprite(position.x, position.y, 'car');
    
        const width = scale;
        const height = this.sprite.height / this.sprite.width * scale;
        
        this.sprite.x += width / 2.0;
        this.sprite.y += height;
        
        // Set sprite scaling by normalizing its size and then rescaling.
        this.sprite.scale.setTo(1.0 / this.sprite.width * width, 1.0 / this.sprite.height * height);
       
        // Set rotation center.
        this.sprite.anchor.setTo(0.5, 0.5);
       
        // Set initial rotation on the track.
        this.sprite.angle = track.getStartRotation();

        this.track = track;
    }
    
    getHood() {
        return new Phaser.Point(this.sprite.width / 2.0, 0).rotate(0, 0, this.sprite.angle, true);
    }
    
    getTrunk() {
        return new Phaser.Point(-this.sprite.width / 2.0, 0).rotate(0, 0, this.sprite.angle, true);
    }
}
