FROM eclipse-temurin:25-jdk AS BASE

WORKDIR /app

COPY .mvn .mvn
COPY mvnw .
COPY pom.xml .

FROM BASE AS DEV

RUN ./mvnw verify clean --fail-never -B

COPY . .

CMD ["./mvnw", "spring-boot:run"]

FROM BASE AS BUILD

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:go-offline -B

COPY . .

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -DskipTests -B

FROM eclipse-temurin:25-jre AS runtime
COPY --link --from=BUILD /app/target/*.jar ./app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

FROM runtime AS debug
EXPOSE 8080 5005
CMD ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]

