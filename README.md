# Mobiquity Bathroom Occupancy Manager Checker (v1.1.1)

This server connects to the Particle/Spark devices mounted
in the Mobiquity bathrooms and creates a table that is
updated with their occupancy settings.

The site lives on http://mobthrooms.herokuapp.com/

## Deployment
If you want to create a Heroku deployment from this repo,
you can! `terraform plan` followed by `terraform apply`
will get you set up.

The `master` branch is pushed to heroku.

The `PARTICLE_ACCESS_TOKEN` environment variable is required
to use this app with real Particle devices.

## Development

    npm install
    node --harmony_destructuring --use-strict .

If you do not provide a particle access token, the server
will create two test devices and periodically swap their
occupancy every 5 and 18 seconds, respectively.
