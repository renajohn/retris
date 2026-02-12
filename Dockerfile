FROM pierrezemb/gostatic:latest AS server

FROM scratch
COPY --from=server /goStatic /goStatic
COPY index.html style.css game.js /srv/http/
ENTRYPOINT ["/goStatic"]
EXPOSE 8042
