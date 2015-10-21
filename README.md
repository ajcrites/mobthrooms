# Mobiquity 606 Bathroom Occupancy Manager Checker

This server connects to the Particle/Spark devices mounted
in the Mobiquity 606 bathrooms and creates a table that is
updated with their occupancy settings.

The site lives on http://mob-606-bathrooms.herokuapp.com/

## Deployment
The `master` branch is pushed to Heroku. **Note** that the
`master` branch contains a monkey-patched version of
`socket.io` because of [this issue](https://github.com/socketio/socket.io/issues/2155)
related to ECMAScript6 / strict compatibility.

This should never be committed to the `dev` branch.
