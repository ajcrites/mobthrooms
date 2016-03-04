variable "heroku_email" {
  description = "The email address for your Heroku account"
}
variable "heroku_api_key" {
  description = "API key for your heroku account; found in various places such as https://dashboard.heroku.com/account"
}
variable "app_name" {
  description = "Name of your app. Will run under https://{app-name}.herokuapp.com/"
}
variable region {
  default = "us"
}

variable "particle_access_token" {
  description = "Access token for your particle board. You will have to set that up for your bathroom on your own"
}

provider "heroku" {
  email = "${var.heroku_email}"
  api_key = "${var.heroku_api_key}"
}

resource "heroku_app" "mobthrooms" {
  name = "${var.app_name}"
  region = "${var.region}"

  config_vars {
    PARTICLE_ACCESS_TOKEN = "${var.particle_access_token}"
  }

  provisioner "local-exec" {
    command = "git push ${heroku_app.mobthrooms.git_url} master"
  }
}
