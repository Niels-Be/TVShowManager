module.exports = function(sequelize, DataTypes) {
    var UserToken = sequelize.define("UserToken", {
        token: {type: DataTypes.STRING(64), primaryKey: true}
    }, {
        classMethods: {
            associate: function(models) {
                UserToken.belongsTo(models.User);
            }
        },
        
        timestamps: true,
        updatedAt: false,
        
    });
    return UserToken;
};