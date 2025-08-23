# USAGE

## NAME

yaal - Yet Another Awesome List

## SYNOPSIS

**npm run dev**

**npm run build**

**npm run dev** [*--config*=*FILE*] [*--readme*=*FILE*] _(legacy support)_

**npm run build** [*--config*=*FILE*] [*--readme*=*FILE*] _(legacy support)_

## DESCRIPTION

**npm run dev** starts the development server.

**npm run build** builds the application for production.

The tool automatically detects configuration and README files by checking:

1. Parent directory first (`../yaal.config.yaml`, `../README.md`)
2. Local directory as fallback (`./yaal.config.yaml`, `./README.md`)

## OPTIONS

**--config**=_FILE_ _(optional, legacy support)_
Use _FILE_ as the configuration file instead of automatic detection.

**--readme**=_FILE_ _(optional, legacy support)_
Use _FILE_ as the README file instead of automatic detection.

## EXAMPLES

Start development server with automatic file detection:

```bash
npm run dev
```

Build with automatic file detection:

```bash
npm run build
```

Legacy usage with explicit parameters (still supported):

```bash
npm run build --config=./config.yaml --readme=./docs/README.md
```
