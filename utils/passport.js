const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;

let opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.PASSPORT_SECRET;
console.log(opts);
const autheticated = passport.use(
    "student",
    new JwtStrategy(opts, async function (jwt_payload, done) {
        const user = await Student.findOne({
            _id: jwt_payload.identifier,
            verified: true,
        });
        // done(error, doesTheUserExist)
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
            // or you could create a new account
        }
    })
);

moduleexports = autheticated;