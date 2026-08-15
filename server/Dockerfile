FROM eclipse-temurin:25-jdk AS base

WORKDIR /app

COPY .mvn .mvn
COPY mvnw .
COPY pom.xml .

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw dependency:go-offline -B

COPY . .

RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw package -DskipTests -B

FROM base AS dev
CMD ["./mvnw", "spring-boot:run"]

FROM eclipse-temurin:25-jre AS runtime
COPY --link --from=base /app/target/*.jar ./app.jar
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]

FROM runtime AS debug
EXPOSE 8080 5005
CMD ["java", "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", "-jar", "app.jar"]

