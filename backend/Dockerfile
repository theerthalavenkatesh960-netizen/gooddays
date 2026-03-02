# multi-stage Dockerfile for GoodDaysApi (.NET)
# built for Render (or any Docker host)

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# copy csproj and restore as distinct layers so dependencies are cached
COPY ["GoodDaysApi/GoodDaysApi.csproj", "GoodDaysApi/"]
RUN dotnet restore "GoodDaysApi/GoodDaysApi.csproj"

# copy everything else and publish
COPY . .
WORKDIR "/src/GoodDaysApi"
RUN dotnet publish "GoodDaysApi.csproj" -c Release -o /app/publish

# runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# Port can be overridden by Render's service configuration
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "GoodDaysApi.dll"]
