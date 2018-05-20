# raspi-cast-server

Forked and largely inspired by [https://gitlab.com/raspberry-pi-cast/cast-server](https://gitlab.com/raspberry-pi-cast/cast-server)
thanks to Giorgian Borca-Tasciuc

## Installation

See the [Raspberry Pi Website](https://www.raspberrypi.org/downloads/) for instructions on how to install Raspbian.

Once Raspbian in installed and connected to the internet you need to install node (nvm is cool !!).

You will also need to enable ssh with raspi-config.

## Setup

Clone the repo on a computer wich is on the same network than your raspberry pi.
Install dependencies:

```bash
git clone git@github.com:charjac/raspi-cast-server.git
cd raspi-cast-server
npm i
```

find your raspberry pi ip, if you dont know it try:

```bash
arp -na | grep -i b8:27:eb
```

Edit env/local.env file with your raspberry pi ip address

## Deploy and Run (thx pm2)

First, we need to setup the raspberry pi ans install all dependencies needed,
then we will install and run the server using pm2.

```bash
npm run deploy:setup
npm run deploy
```

That's all folks !

## Cast

Now, to cast videos to your Raspberry Pi, you can use this firefox add on
[raspi-cast-web-ext](https://github.com/charjac/raspi-cast-web-ext).
