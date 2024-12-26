#!/bin/bash

project_dir=$(pwd)

cd tailwind
npx tailwindcss -i ${project_dir}/tailwind/src/default-styles.css -o ${project_dir}/assets/css/main.css