# USAGE

## NAME

yaal - Yet Another Awesome List

## SYNOPSIS

**npm run dev** [*--config*=*FILE*] [*--readme*=*FILE*]

**npm run build** [*--config*=*FILE*] [*--readme*=*FILE*]

## DESCRIPTION

**npm run dev** starts the development server.

**npm run build** builds the application for production.

## OPTIONS

**--config**=_FILE_
Use _FILE_ as the configuration file instead of the default _./yaal.config.yaml_.

**--readme**=_FILE_
Use _FILE_ as the README file instead of the default _./README.md_.

## EXAMPLES

Start development server with default configuration:

```bash
npm run dev
```

Build with custom configuration:

```bash
npm run build --config=./config.yaml
```

Build with custom README:

```bash
npm run build --readme=./docs/README.md
```

Build with both custom configuration and README:

```bash
npm run build --config=./config/production.yaml --readme=./docs/README.md
```
