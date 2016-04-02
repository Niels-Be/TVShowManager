
module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define("User", {
        id: {type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false},
        name: {type: DataTypes.STRING, unique: true, allowNull: false, validate: {len: [3,255]}},
        password: {type: DataTypes.STRING(64), allowNull: false }
    }, {
        classMethods: {
            associate: function(models) {
                User.hasMany(models.UserToken);
                User.belongsToMany(models.Show, { through: models.UserShow });
            }
        },
        
        timestamps: true,
        updatedAt: false,
        
    });
    
    return User;
};

 