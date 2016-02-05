# Mobiquity Bathroom Occupancy Manager Checker

This server connects to the Particle/Spark devices mounted
in the Mobiquity bathrooms and creates a table that is
updated with their occupancy settings.

The site lives on http://mobthrooms.herokuapp.com/

## Deployment
The `master` branch is pushed to Heroku.

The `PARTICLE_ACCESS_TOKEN` environment variable is required
to use this app with real Particle devices.

## Development

    npm install
    node --harmony_destructuring --use-strict .

If you do not provide a particle access token, the server
will create two test devices and periodically swap their
occupancy every 5 and 18 seconds, respectively.
